/**
 * AETHER 3D — SPATIAL WEB ARCHITECTURE & CONTROLLER
 * Full WebGL 3D Scene, Kinetic Camera Transitions, & Adaptive Theming Engine
 */

(function () {
  "use strict";

  // --- 1. SPATIAL SECTION WAYPOINTS ---
  // Coordinates and target focal points for cinematic camera choreography
  const SECTION_WAYPOINTS = {
    hero: {
      index: 0,
      camPos: { x: 0, y: 1.5, z: 20 },
      lookAt: { x: 0, y: 0, z: 0 },
      label: "Sector 01: Prime Core"
    },
    about: {
      index: 1,
      camPos: { x: -16, y: 3, z: 12 },
      lookAt: { x: -14, y: 0, z: -2 },
      label: "Sector 02: Architectural Manifesto"
    },
    services: {
      index: 2,
      camPos: { x: -8, y: -7, z: 26 },
      lookAt: { x: -6, y: -7, z: 10 },
      label: "Sector 03: Capability Prisms"
    },
    portfolio: {
      index: 3,
      camPos: { x: 18, y: 4, z: 12 },
      lookAt: { x: 14, y: 1, z: -2 },
      label: "Sector 04: Project Constellations"
    },
    testimonials: {
      index: 4,
      camPos: { x: 12, y: -5, z: 28 },
      lookAt: { x: 8, y: -5, z: 12 },
      label: "Sector 05: Client Horizon"
    },
    contact: {
      index: 5,
      camPos: { x: 0, y: -14, z: 32 },
      lookAt: { x: 0, y: -14, z: 18 },
      label: "Sector 06: Terminal Gateway"
    }
  };

  // --- 2. STATE MANAGER ---
  const state = {
    currentSection: "hero",
    isTransitioning: false,
    theme: "system", // 'light' | 'dark' | 'system'
    resolvedTheme: "dark",
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    mouse: { x: 0, y: 0, targetX: 0, targetY: 0 },
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    orbitOffset: { x: 0, y: 0 }
  };

  // --- 3. THEME & APPEARANCE SYSTEM ---
  const ThemeEngine = {
    init() {
      const saved = localStorage.getItem("aether-theme") || "system";
      this.setTheme(saved, false);

      // Listen for OS system theme shifts
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
        if (state.theme === "system") {
          this.applyResolvedTheme(this.getSystemPreference());
        }
      });

      // Bind toggle buttons
      document.querySelectorAll(".theme-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const mode = btn.getAttribute("data-mode");
          this.setTheme(mode, true);
        });
      });
    },

    getSystemPreference() {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    },

    setTheme(mode, persist = true) {
      state.theme = mode;
      if (persist) {
        localStorage.setItem("aether-theme", mode);
      }

      const resolved = mode === "system" ? this.getSystemPreference() : mode;
      this.applyResolvedTheme(resolved);

      // Update UI active buttons
      document.querySelectorAll(".theme-btn").forEach((btn) => {
        const isActive = btn.getAttribute("data-mode") === mode;
        btn.classList.toggle("active", isActive);
        btn.setAttribute("aria-checked", isActive ? "true" : "false");
      });
    },

    applyResolvedTheme(resolved) {
      state.resolvedTheme = resolved;
      document.documentElement.setAttribute("data-theme", resolved);

      // Harmonize 3D Scene
      if (WebGLScene.isReady) {
        WebGLScene.updateTheme(resolved);
      }
    }
  };

  // --- 4. THREE.JS 3D SPATIAL ENGINE ---
  const WebGLScene = {
    isReady: false,
    scene: null,
    camera: null,
    renderer: null,
    lights: {},
    materials: {},
    interactiveObjects: [],
    raycaster: new THREE.Raycaster(),
    currentLookAt: new THREE.Vector3(0, 0, 0),
    particleSystem: null,

    init() {
      const container = document.getElementById("webgl-container");
      if (!this.checkSupport()) {
        document.getElementById("webgl-fallback").style.display = "block";
        return;
      }

      // 1. Scene & Camera
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
      const startWp = SECTION_WAYPOINTS.hero;
      this.camera.position.set(startWp.camPos.x, startWp.camPos.y, startWp.camPos.z);
      this.currentLookAt.set(startWp.lookAt.x, startWp.lookAt.y, startWp.lookAt.z);
      this.camera.lookAt(this.currentLookAt);

      // 2. High-Performance Renderer
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance"
      });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.0;
      container.appendChild(this.renderer.domElement);

      // 3. Lighting Architecture
      this.setupLighting();

      // 4. Procedural 3D Spatial Geometry
      this.buildSpatialObjects();
      this.buildParticleField();

      // 5. Events & Render Loop
      this.bindEvents();
      this.isReady = true;

      // Initial theme synchronization
      this.updateTheme(state.resolvedTheme);
      this.animate();
    },

    checkSupport() {
      try {
        const canvas = document.createElement("canvas");
        return !!(window.WebGLRenderingContext && (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")));
      } catch (e) {
        return false;
      }
    },

    setupLighting() {
      // Soft ambient light
      this.lights.ambient = new THREE.AmbientLight(0xffffff, 0.6);
      this.scene.add(this.lights.ambient);

      // Key light with cyan/blue tint
      this.lights.key = new THREE.DirectionalLight(0x00f0ff, 1.2);
      this.lights.key.position.set(15, 20, 15);
      this.scene.add(this.lights.key);

      // Accent rim light with violet tint
      this.lights.rim = new THREE.PointLight(0x8b5cf6, 1.5, 60);
      this.lights.rim.position.set(-15, -10, -10);
      this.scene.add(this.lights.rim);

      // Front subtle fill
      this.lights.fill = new THREE.PointLight(0x38bdf8, 0.8, 50);
      this.lights.fill.position.set(0, 5, 25);
      this.scene.add(this.lights.fill);
    },

    buildSpatialObjects() {
      // --- NODE 01: HERO CORE (Central Quantum Icosahedron) ---
      const coreGroup = new THREE.Group();
      coreGroup.name = "hero-core";
      coreGroup.position.set(0, 0, 0);

      const coreGeo = new THREE.IcosahedronGeometry(2.4, 1);
      this.materials.core = new THREE.MeshStandardMaterial({
        color: 0x1d4ed8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.35,
        roughness: 0.25,
        metalness: 0.85,
        wireframe: false
      });
      const coreMesh = new THREE.Mesh(coreGeo, this.materials.core);
      coreGroup.add(coreMesh);

      // Orbiting Holographic Rings
      const ringGeo1 = new THREE.TorusGeometry(3.6, 0.04, 16, 100);
      this.materials.ring = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.7 });
      const ringMesh1 = new THREE.Mesh(ringGeo1, this.materials.ring);
      ringMesh1.rotation.x = Math.PI / 3;
      coreGroup.add(ringMesh1);

      const ringGeo2 = new THREE.TorusGeometry(4.2, 0.03, 16, 100);
      const ringMesh2 = new THREE.Mesh(ringGeo2, this.materials.ring);
      ringMesh2.rotation.y = Math.PI / 4;
      coreGroup.add(ringMesh2);

      this.scene.add(coreGroup);
      this.heroCore = coreGroup;

      // --- NODE 02: ABOUT MONOLITH (Left Spatial Sector) ---
      const aboutGroup = new THREE.Group();
      aboutGroup.position.set(-14, 0, -4);
      const monoGeo = new THREE.BoxGeometry(2.2, 6.5, 2.2);
      this.materials.mono = new THREE.MeshStandardMaterial({
        color: 0x334155,
        metalness: 0.9,
        roughness: 0.15,
        emissive: 0x0ea5e9,
        emissiveIntensity: 0.2
      });
      const monoMesh = new THREE.Mesh(monoGeo, this.materials.mono);
      aboutGroup.add(monoMesh);

      // Orbiting beacon indicator
      const beaconGeo = new THREE.OctahedronGeometry(0.7);
      this.materials.beacon = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 0.8 });
      const beaconMesh = new THREE.Mesh(beaconGeo, this.materials.beacon);
      beaconMesh.position.set(0, 4.5, 0);
      aboutGroup.add(beaconMesh);

      this.scene.add(aboutGroup);
      this.aboutGroup = aboutGroup;

      // --- NODE 03: CAPABILITY PRISMS (Services Sector) ---
      const servicesGroup = new THREE.Group();
      servicesGroup.position.set(-6, -7, 10);
      this.serviceCubes = [];

      for (let i = 0; i < 4; i++) {
        const cubeGeo = new THREE.DodecahedronGeometry(1.2);
        const cubeMat = new THREE.MeshStandardMaterial({
          color: 0x1e293b,
          metalness: 0.7,
          roughness: 0.3,
          emissive: 0x6366f1,
          emissiveIntensity: 0.25
        });
        const cube = new THREE.Mesh(cubeGeo, cubeMat);
        cube.position.set((i - 1.5) * 3.5, Math.sin(i) * 1.2, 0);
        cube.userData = { id: `service-${i + 1}`, originalY: cube.position.y };
        servicesGroup.add(cube);
        this.serviceCubes.push(cube);
        this.interactiveObjects.push(cube);
      }
      this.scene.add(servicesGroup);
      this.servicesGroup = servicesGroup;

      // --- NODE 04: PORTFOLIO CONSTELLATION (Right Spatial Sector) ---
      const portGroup = new THREE.Group();
      portGroup.position.set(14, 1, -2);
      for (let i = 0; i < 3; i++) {
        const torusGeo = new THREE.TorusKnotGeometry(1.1, 0.3, 64, 16);
        const torusMat = new THREE.MeshStandardMaterial({
          color: 0x0f172a,
          roughness: 0.2,
          metalness: 0.8,
          emissive: i === 0 ? 0x0284c7 : i === 1 ? 0x9333ea : 0xf43f5e,
          emissiveIntensity: 0.5
        });
        const knot = new THREE.Mesh(torusGeo, torusMat);
        knot.position.set((i - 1) * 4.2, (i % 2 === 0 ? 1 : -1) * 1.5, 0);
        knot.userData = { id: `project-${i + 1}` };
        portGroup.add(knot);
        this.interactiveObjects.push(knot);
      }
      this.scene.add(portGroup);
      this.portGroup = portGroup;

      // --- NODE 05: TERMINAL GATEWAY (Contact Sector) ---
      const contactGroup = new THREE.Group();
      contactGroup.position.set(0, -14, 18);
      const beaconRingGeo = new THREE.RingGeometry(3.5, 4.0, 32);
      const beaconRingMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
      const contactRing = new THREE.Mesh(beaconRingGeo, beaconRingMat);
      contactRing.rotation.x = Math.PI / 2;
      contactGroup.add(contactRing);

      this.scene.add(contactGroup);
      this.contactGroup = contactGroup;
    },

    buildParticleField() {
      const count = 1200;
      const positions = new Float32Array(count * 3);
      const scales = new Float32Array(count);

      for (let i = 0; i < count; i++) {
        positions[i * 3 + 0] = (Math.random() - 0.5) * 80;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 60;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 80;
        scales[i] = Math.random() * 2 + 0.5;
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

      this.particleMaterial = new THREE.PointsMaterial({
        color: 0x00f0ff,
        size: 0.15,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending
      });

      this.particleSystem = new THREE.Points(geo, this.particleMaterial);
      this.scene.add(this.particleSystem);
    },

    updateTheme(theme) {
      const isDark = theme === "dark";
      // Update scene fog & background
      const bgColor = isDark ? 0x07090e : 0xf8fafc;
      this.scene.background = new THREE.Color(bgColor);
      this.scene.fog = new THREE.FogExp2(bgColor, isDark ? 0.018 : 0.015);

      // Lighting updates
      if (this.lights.ambient) {
        this.lights.ambient.intensity = isDark ? 0.45 : 0.95;
      }
      if (this.lights.key) {
        this.lights.key.intensity = isDark ? 1.4 : 1.0;
        this.lights.key.color.setHex(isDark ? 0x00f0ff : 0x2563eb);
      }
      if (this.particleMaterial) {
        this.particleMaterial.color.setHex(isDark ? 0x00f0ff : 0x2563eb);
        this.particleMaterial.opacity = isDark ? 0.65 : 0.35;
      }
    },

    flyToSection(sectionKey) {
      const target = SECTION_WAYPOINTS[sectionKey];
      if (!target || state.isTransitioning) return;

      state.isTransitioning = true;
      const duration = state.reducedMotion ? 10 : 1400;

      // Update HUD & Section states immediately
      AppController.syncActiveSection(sectionKey);

      // Camera position tween
      new TWEEN.Tween(this.camera.position)
        .to(target.camPos, duration)
        .easing(TWEEN.Easing.Cubic.InOut)
        .start();

      // Camera LookAt tween
      new TWEEN.Tween(this.currentLookAt)
        .to(target.lookAt, duration)
        .easing(TWEEN.Easing.Cubic.InOut)
        .onUpdate(() => {
          this.camera.lookAt(this.currentLookAt);
        })
        .onComplete(() => {
          state.isTransitioning = false;
        })
        .start();
    },

    bindEvents() {
      window.addEventListener("resize", () => {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
      });

      // Pointer parallax & drag orbit
      window.addEventListener("mousemove", (e) => {
        state.mouse.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
        state.mouse.targetY = (e.clientY / window.innerHeight - 0.5) * 2;

        if (state.isDragging) {
          const deltaX = (e.clientX - state.dragStart.x) * 0.008;
          const deltaY = (e.clientY - state.dragStart.y) * 0.008;
          state.orbitOffset.x += deltaX;
          state.orbitOffset.y = Math.max(-0.6, Math.min(0.6, state.orbitOffset.y + deltaY));
          state.dragStart = { x: e.clientX, y: e.clientY };
        }
      });

      window.addEventListener("mousedown", (e) => {
        // Only initiate 3D drag on empty canvas or non-interactive elements
        if (e.target.closest(".section-card, .app-header, .spatial-hud")) return;
        state.isDragging = true;
        state.dragStart = { x: e.clientX, y: e.clientY };
      });

      window.addEventListener("mouseup", () => {
        state.isDragging = false;
      });

      // Touch events for mobile drag
      window.addEventListener("touchmove", (e) => {
        if (e.touches.length === 1 && !e.target.closest(".section-card, .app-header")) {
          const touch = e.touches[0];
          state.mouse.targetX = (touch.clientX / window.innerWidth - 0.5) * 2;
          state.mouse.targetY = (touch.clientY / window.innerHeight - 0.5) * 2;
        }
      }, { passive: true });
    },

    animate() {
      requestAnimationFrame(() => this.animate());

      TWEEN.update();

      // Smooth pointer interpolation
      state.mouse.x += (state.mouse.targetX - state.mouse.x) * 0.05;
      state.mouse.y += (state.mouse.targetY - state.mouse.y) * 0.05;

      // Subtle ambient camera sway based on mouse + orbit
      if (!state.isTransitioning) {
        this.camera.position.x += (SECTION_WAYPOINTS[state.currentSection].camPos.x + state.mouse.x * 0.8 + state.orbitOffset.x * 4 - this.camera.position.x) * 0.04;
        this.camera.position.y += (SECTION_WAYPOINTS[state.currentSection].camPos.y - state.mouse.y * 0.8 + state.orbitOffset.y * 3 - this.camera.position.y) * 0.04;
        this.camera.lookAt(this.currentLookAt);
      }

      // Procedural animations for 3D elements
      if (this.heroCore) {
        this.heroCore.rotation.y += 0.008;
        this.heroCore.rotation.x += 0.004;
      }
      if (this.aboutGroup) {
        this.aboutGroup.rotation.y += 0.006;
      }
      if (this.serviceCubes) {
        this.serviceCubes.forEach((c, idx) => {
          c.rotation.x += 0.01 + idx * 0.002;
          c.rotation.y += 0.015;
          c.position.y = c.userData.originalY + Math.sin(Date.now() * 0.002 + idx) * 0.3;
        });
      }
      if (this.particleSystem) {
        this.particleSystem.rotation.y += 0.0006;
      }

      // Update HUD coordinates live
      const coordEl = document.getElementById("hud-coordinates");
      if (coordEl) {
        coordEl.textContent = `X: ${this.camera.position.x.toFixed(2)} Y: ${this.camera.position.y.toFixed(2)} Z: ${this.camera.position.z.toFixed(2)}`;
      }

      this.renderer.render(this.scene, this.camera);
    }
  };

  // --- 5. APPLICATION CONTROLLER & ACCESSIBILITY ---
  const AppController = {
    init() {
      this.bindNavigation();
      this.bindForm();
      this.bindKeyboardNav();
      this.initIntersectionObserver();
      this.simulateLoader();
    },

    bindNavigation() {
      // All elements with data-section attribute
      document.querySelectorAll("[data-section]").forEach((el) => {
        el.addEventListener("click", (e) => {
          e.preventDefault();
          const target = el.getAttribute("data-section");
          if (target && SECTION_WAYPOINTS[target]) {
            WebGLScene.flyToSection(target);
            this.closeMobileDrawer();
          }
        });
      });

      // Mobile Drawer Toggle
      const toggle = document.getElementById("mobile-toggle");
      const drawer = document.getElementById("mobile-nav-drawer");
      if (toggle && drawer) {
        toggle.addEventListener("click", () => {
          const isOpen = drawer.classList.toggle("open");
          toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
          drawer.setAttribute("aria-hidden", isOpen ? "false" : "true");
        });
      }
    },

    closeMobileDrawer() {
      const drawer = document.getElementById("mobile-nav-drawer");
      const toggle = document.getElementById("mobile-toggle");
      if (drawer && drawer.classList.contains("open")) {
        drawer.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
        drawer.setAttribute("aria-hidden", "true");
      }
    },

    syncActiveSection(sectionKey) {
      state.currentSection = sectionKey;

      // Update Nav Buttons
      document.querySelectorAll(".nav-btn, .mobile-nav-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.getAttribute("data-section") === sectionKey);
      });

      // Update HUD dots
      document.querySelectorAll(".hud-dot").forEach((dot) => {
        dot.classList.toggle("active", dot.getAttribute("data-section") === sectionKey);
      });

      // Update Spatial Section Overlay visibility
      document.querySelectorAll(".spatial-section").forEach((sec) => {
        const isActive = sec.id === `section-${sectionKey}`;
        sec.classList.toggle("active", isActive);
      });

      // Screen reader announcement
      const announcer = document.getElementById("sr-announcer");
      if (announcer && SECTION_WAYPOINTS[sectionKey]) {
        announcer.textContent = `Navigated to ${SECTION_WAYPOINTS[sectionKey].label}`;
      }
    },

    bindKeyboardNav() {
      const keyMap = {
        "1": "hero",
        "2": "about",
        "3": "services",
        "4": "portfolio",
        "5": "testimonials",
        "6": "contact"
      };

      window.addEventListener("keydown", (e) => {
        // Ignore if user is typing in form fields
        if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) return;

        if (keyMap[e.key]) {
          WebGLScene.flyToSection(keyMap[e.key]);
        }
      });
    },

    initIntersectionObserver() {
      // When user manually scrolls down the page, sync the 3D camera
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !state.isTransitioning) {
            const sectionId = entry.target.id.replace("section-", "");
            if (SECTION_WAYPOINTS[sectionId] && state.currentSection !== sectionId) {
              WebGLScene.flyToSection(sectionId);
            }
          }
        });
      }, { threshold: 0.45 });

      document.querySelectorAll(".spatial-section").forEach((sec) => observer.observe(sec));
    },

    bindForm() {
      const form = document.getElementById("contact-form");
      const alertBox = document.getElementById("form-alert");
      const submitBtn = document.getElementById("submit-btn");

      if (!form) return;

      form.addEventListener("submit", (e) => {
        e.preventDefault();

        // Clear errors
        document.querySelectorAll(".field-error").forEach((el) => (el.textContent = ""));
        alertBox.style.display = "none";

        let isValid = true;
        const name = form.name.value.trim();
        const email = form.email.value.trim();
        const message = form.message.value.trim();

        if (!name) {
          document.getElementById("name-error").textContent = "Please enter your name.";
          isValid = false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
          document.getElementById("email-error").textContent = "Please provide a valid email address.";
          isValid = false;
        }

        if (!message || message.length < 10) {
          document.getElementById("message-error").textContent = "Message must be at least 10 characters.";
          isValid = false;
        }

        if (!isValid) return;

        // Simulated submission state
        submitBtn.classList.add("submitting");
        submitBtn.disabled = true;

        setTimeout(() => {
          submitBtn.classList.remove("submitting");
          submitBtn.disabled = false;
          form.reset();

          alertBox.className = "form-alert success";
          alertBox.textContent = "Transmission received. Our engineering lead will respond within 24 hours.";
          alertBox.style.display = "block";
        }, 1400);
      });
    },

    simulateLoader() {
      const progress = document.getElementById("loader-progress");
      const loader = document.getElementById("loading-screen");
      let percent = 0;

      const interval = setInterval(() => {
        percent += Math.floor(Math.random() * 25) + 15;
        if (percent > 100) percent = 100;
        if (progress) progress.style.width = `${percent}%`;

        if (percent >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            if (loader) loader.classList.add("fade-out");
          }, 400);
        }
      }, 120);
    }
  };

  // --- 6. BOOTSTRAP ENTRYPOINT ---
  document.addEventListener("DOMContentLoaded", () => {
    ThemeEngine.init();
    WebGLScene.init();
    AppController.init();
  });
})();
