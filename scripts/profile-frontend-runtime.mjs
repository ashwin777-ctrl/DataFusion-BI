import { chromium } from '@playwright/test';

const PROD_URL = 'https://data-fusion-bi.vercel.app';
const USERNAME = 'ashwin@datafusion.io';
const PASSWORD = 'Admin@123456';

// Helper to inject FPS & LongTask monitor into the page
async function setupRuntimeMonitor(page) {
  await page.evaluate(() => {
    window.__perfData = {
      frames: [],
      longTasks: [],
      startTime: performance.now(),
    };

    // Long task observer
    if ('PerformanceObserver' in window) {
      try {
        const po = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            window.__perfData.longTasks.push({
              name: entry.name,
              duration: entry.duration,
              startTime: entry.startTime,
            });
          }
        });
        po.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        console.warn('LongTask observer not supported', e);
      }
    }

    // Continuous rAF monitor
    let lastTime = performance.now();
    function onFrame(time) {
      const delta = time - lastTime;
      lastTime = time;
      if (window.__perfData.recording) {
        window.__perfData.frames.push(delta);
      }
      requestAnimationFrame(onFrame);
    }
    requestAnimationFrame(onFrame);

    window.__startRecording = () => {
      window.__perfData.recording = true;
      window.__perfData.frames = [];
      window.__perfData.longTasks = [];
    };

    window.__stopRecording = () => {
      window.__perfData.recording = false;
      const frames = window.__perfData.frames;
      const totalFrames = frames.length;
      if (totalFrames === 0) return { fps: 0, avgFrameTime: 0, p95FrameTime: 0, droppedFrames: 0, longTasks: [] };
      
      const totalTime = frames.reduce((a, b) => a + b, 0);
      const avgFrameTime = totalTime / totalFrames;
      const fps = Math.round((totalFrames / (totalTime / 1000)) * 10) / 10;
      
      const sorted = [...frames].sort((a, b) => a - b);
      const p95FrameTime = Math.round(sorted[Math.floor(totalFrames * 0.95)] * 100) / 100;
      const maxFrameTime = Math.round(sorted[sorted.length - 1] * 100) / 100;
      const droppedFrames = frames.filter(f => f > 20).length; // frames > 20ms (< 50fps)
      const severeJankFrames = frames.filter(f => f > 50).length; // frames > 50ms (< 20fps)

      return {
        fps,
        avgFrameTime: Math.round(avgFrameTime * 100) / 100,
        p95FrameTime,
        maxFrameTime,
        totalFrames,
        droppedFrames,
        severeJankFrames,
        longTasks: [...window.__perfData.longTasks],
      };
    };
  });
}

async function runScrollBenchmark(page, label, scrollDistance = 2500, step = 40, interval = 16) {
  // Start recording
  await page.evaluate(() => window.__startRecording());

  // Perform smooth programmatic scroll down then up
  await page.evaluate(async ({ dist, step, interval }) => {
    let current = 0;
    // Scroll down
    while (current < dist) {
      current += step;
      window.scrollTo(0, current);
      await new Promise(r => setTimeout(r, interval));
    }
    // Pause briefly
    await new Promise(r => setTimeout(r, 100));
    // Scroll up
    while (current > 0) {
      current -= step;
      window.scrollTo(0, current);
      await new Promise(r => setTimeout(r, interval));
    }
  }, { dist: scrollDistance, step, interval });

  const stats = await page.evaluate(() => window.__stopRecording());
  console.log(`[SCROLL BENCHMARK: ${label}]`);
  console.log(`  FPS: ${stats.fps} | Avg Frame: ${stats.avgFrameTime}ms | P95 Frame: ${stats.p95FrameTime}ms | Max: ${stats.maxFrameTime}ms`);
  console.log(`  Total Frames: ${stats.totalFrames} | Dropped (>20ms): ${stats.droppedFrames} | Severe Jank (>50ms): ${stats.severeJankFrames}`);
  console.log(`  Long Tasks (>=50ms): ${stats.longTasks.length} tasks (total duration: ${Math.round(stats.longTasks.reduce((acc, t) => acc + t.duration, 0))}ms)`);
  return stats;
}

async function runThemeSwitchBenchmark(page, cdp) {
  console.log(`\n[THEME SWITCH BENCHMARK]`);
  const themeModes = ['dark', 'light', 'system', 'dark'];
  const results = [];

  for (const targetTheme of themeModes) {
    // Get CDP metrics before
    const beforeMetrics = await cdp.send('Performance.getMetrics');
    const getMetric = (list, name) => list.find(m => m.name === name)?.value ?? 0;

    await page.evaluate(() => window.__startRecording());
    const t0 = Date.now();

    // Click theme button or trigger setTheme
    await page.evaluate((theme) => {
      // Find the button in theme-switcher
      const btn = document.querySelector(`button[aria-label="${theme.charAt(0).toUpperCase() + theme.slice(1)} theme"]`);
      if (btn) {
        btn.click();
      } else {
        // Fallback: document.documentElement
        document.documentElement.className = theme === 'dark' ? 'dark' : '';
      }
    }, targetTheme);

    // Wait 300ms for theme transition & re-renders to settle
    await page.waitForTimeout(400);
    const duration = Date.now() - t0;

    const stats = await page.evaluate(() => window.__stopRecording());
    const afterMetrics = await cdp.send('Performance.getMetrics');

    const layoutDurationDelta = (getMetric(afterMetrics.metrics, 'LayoutDuration') - getMetric(beforeMetrics.metrics, 'LayoutDuration')) * 1000;
    const recalcStyleDelta = (getMetric(afterMetrics.metrics, 'RecalcStyleDuration') - getMetric(beforeMetrics.metrics, 'RecalcStyleDuration')) * 1000;
    const scriptDurationDelta = (getMetric(afterMetrics.metrics, 'ScriptDuration') - getMetric(beforeMetrics.metrics, 'ScriptDuration')) * 1000;
    const jsHeap = Math.round(getMetric(afterMetrics.metrics, 'JSHeapUsedSize') / (1024 * 1024) * 10) / 10;

    console.log(`  Switch to -> ${targetTheme}: total ${duration}ms | Script: ${Math.round(scriptDurationDelta)}ms | RecalcStyle: ${Math.round(recalcStyleDelta)}ms | Layout: ${Math.round(layoutDurationDelta)}ms | Heap: ${jsHeap}MB`);
    console.log(`    FPS: ${stats.fps} | P95 Frame: ${stats.p95FrameTime}ms | Long Tasks: ${stats.longTasks.length}`);
    results.push({ targetTheme, duration, scriptDurationDelta, recalcStyleDelta, layoutDurationDelta, stats });
  }

  return results;
}

async function runThreeJsIsolationBenchmark(page) {
  console.log(`\n[THREE.JS ISOLATION BENCHMARK]`);
  // Check if WebGL canvas is present
  const hasCanvas = await page.evaluate(() => !!document.querySelector('canvas'));
  console.log(`  WebGL Canvas Present: ${hasCanvas}`);

  if (!hasCanvas) {
    console.log('  No canvas on this page. Skipping.');
    return null;
  }

  // Baseline scroll with Three.js active
  console.log('  Step A: Scrolling WITH Three.js running...');
  const withThree = await runScrollBenchmark(page, 'With Three.js running', 1500, 50, 16);

  // Pause Three.js by overriding requestAnimationFrame for canvas or setting opacity: 0 / display: none
  console.log('  Step B: Pausing / Hiding Three.js Canvas...');
  await page.evaluate(() => {
    const canvases = document.querySelectorAll('canvas');
    canvases.forEach(c => {
      c.dataset.origDisplay = c.style.display;
      c.style.display = 'none';
    });
  });

  await page.waitForTimeout(500);
  const withoutThree = await runScrollBenchmark(page, 'WITHOUT Three.js (Canvas Hidden)', 1500, 50, 16);

  // Restore canvas
  await page.evaluate(() => {
    const canvases = document.querySelectorAll('canvas');
    canvases.forEach(c => {
      c.style.display = c.dataset.origDisplay || '';
    });
  });

  const fpsDelta = withoutThree.fps - withThree.fps;
  const p95Delta = withThree.p95FrameTime - withoutThree.p95FrameTime;
  console.log(`  -> Three.js Overhead Delta: FPS Impact: ${fpsDelta > 0 ? '-' + fpsDelta : '+' + Math.abs(fpsDelta)} fps, P95 Frame Overhead: ${p95Delta}ms`);

  return { withThree, withoutThree, fpsDelta, p95Delta };
}

async function runMemoryLeakTest(page) {
  console.log(`\n[MEMORY LEAK TEST — Section Navigations]`);
  const navigations = ['/app', '/app/insights', '/app/sources', '/app', '/app/insights', '/app/sources', '/app'];
  const heapSnapshots = [];

  for (let i = 0; i < navigations.length; i++) {
    const route = navigations[i];
    await page.goto(`${PROD_URL}${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const heap = await page.evaluate(() => {
      if (window.performance && window.performance.memory) {
        return Math.round(window.performance.memory.usedJSHeapSize / (1024 * 1024) * 10) / 10;
      }
      return null;
    });
    console.log(`  Step ${i + 1}: Visited ${route} -> Used JS Heap: ${heap ? heap + ' MB' : 'N/A'}`);
    heapSnapshots.push({ route, heap });
  }
  return heapSnapshots;
}

async function main() {
  console.log(`================================================================`);
  console.log(`[FRONTEND RUNTIME AUDIT] Live Target: ${PROD_URL}`);
  console.log(`================================================================\n`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-precise-memory-info', '--js-flags=--expose-gc']
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Performance.enable');

  // 1. LANDING PAGE PROFILING
  console.log(`--- PART 1: LANDING PAGE (/) ---`);
  await page.goto(`${PROD_URL}/`, { waitUntil: 'networkidle' });
  await setupRuntimeMonitor(page);
  await page.waitForTimeout(1500); // let initial Three.js scenes mount

  // Scroll Landing Page
  const landingScroll = await runScrollBenchmark(page, 'Landing Page Normal Scroll', 2500, 40, 16);
  // Three.js isolation on Landing Page
  const landingThreeJs = await runThreeJsIsolationBenchmark(page);
  // Theme switch on Landing Page
  const landingTheme = await runThemeSwitchBenchmark(page, cdp);

  // 2. DASHBOARD PROFILING
  console.log(`\n--- PART 2: DASHBOARD (/app) ---`);
  // Login first
  await page.goto(`${PROD_URL}/login`, { waitUntil: 'networkidle' });
  await page.fill('input#email', USERNAME);
  await page.fill('input#password', PASSWORD);
  await Promise.all([
    page.waitForURL('**/app', { timeout: 20000 }),
    page.click('button[type="submit"]')
  ]);
  await page.waitForTimeout(2000); // let widgets & topology render
  await setupRuntimeMonitor(page);

  // Scroll Dashboard
  const dashScroll = await runScrollBenchmark(page, 'Dashboard Normal Scroll', 2500, 40, 16);
  // Three.js isolation on Dashboard
  const dashThreeJs = await runThreeJsIsolationBenchmark(page);
  // Theme switch on Dashboard
  const dashTheme = await runThemeSwitchBenchmark(page, cdp);

  // 3. MEMORY LEAK TEST
  const memoryTest = await runMemoryLeakTest(page);

  await browser.close();

  console.log(`\n================================================================`);
  console.log(`[FRONTEND RUNTIME AUDIT COMPLETED]`);
  console.log(`================================================================`);
}

main().catch(console.error);
