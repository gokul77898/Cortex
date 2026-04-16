import * as THREE from 'three';
import gsap from 'gsap';

// ============================================
// MARINE ODYSSEY - ULTRA REALISTIC EXPERIENCE
// Advanced 3D with Lifelike Animations
// ============================================

class MarineOdyssey {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });

    this.clock = new THREE.Clock();
    this.depth = 0;
    this.maxDepth = 11000;
    this.targetDepth = 0;
    this.mouseX = 0;
    this.mouseY = 0;
    this.soundEnabled = false;
    this.audioContext = null;

    this.creatures = [];
    this.fishSchools = [];
    this.jellyfish = [];
    this.sharks = [];
    this.whales = [];
    this.deepSeaCreatures = [];
    this.bubbles = [];
    this.plankton = [];
    this.causticLights = [];

    this.zones = [
      { name: 'SUNLIGHT ZONE', min: 0, max: 200, color: new THREE.Color(0x00aaff), fogDensity: 0.003, lightIntensity: 1.0 },
      { name: 'TWILIGHT ZONE', min: 200, max: 1000, color: new THREE.Color(0x0055aa), fogDensity: 0.006, lightIntensity: 0.4 },
      { name: 'MIDNIGHT ZONE', min: 1000, max: 4000, color: new THREE.Color(0x002255), fogDensity: 0.012, lightIntensity: 0.1 },
      { name: 'ABYSSAL ZONE', min: 4000, max: 6000, color: new THREE.Color(0x001133), fogDensity: 0.02, lightIntensity: 0.02 },
      { name: 'HADAL ZONE', min: 6000, max: 11000, color: new THREE.Color(0x000011), fogDensity: 0.03, lightIntensity: 0.0 }
    ];

    this.creaturesData = [
      { name: 'Coral Reef Ecosystem', depth: [0, 200], info: 'Home to 25% of all marine species. Coral polyps build calcium carbonate skeletons over thousands of years, creating intricate structures visible from space.', type: 'coral' },
      { name: 'Clownfish & Anemone', depth: [0, 50], info: 'A perfect symbiosis: clownfish are immune to anemone stings and protect their host from predators while getting shelter in return.', type: 'clownfish' },
      { name: 'Bluefin Tuna School', depth: [0, 300], info: 'Capable of reaching 50 mph, bluefin tuna are warm-blooded fish that can regulate their body temperature, a rarity in the fish world.', type: 'tuna' },
      { name: 'Green Sea Turtle', depth: [0, 300], info: 'Ancient mariners that navigate using Earth\'s magnetic field. They can hold their breath for up to 7 hours while sleeping underwater.', type: 'turtle' },
      { name: 'Great White Shark', depth: [0, 1200], info: 'Apex predators with 300 serrated teeth in 7 rows. They can detect one drop of blood in 25 gallons of water from 3 miles away.', type: 'shark' },
      { name: 'Moon Jellyfish Bloom', depth: [100, 800], info: 'Drifting for 500 million years, jellyfish are 95% water with no brain, heart, or blood. Some are biologically immortal.', type: 'jellyfish' },
      { name: 'Giant Pacific Octopus', depth: [100, 1500], info: 'The most intelligent invertebrate with 3 hearts and blue blood. Each arm has its own "mini-brain" with 40 million neurons.', type: 'octopus' },
      { name: 'Blue Whale', depth: [0, 500], info: 'The largest animal ever to exist. Their hearts weigh 400 pounds, and their calls travel 1,000 miles underwater.', type: 'whale' },
      { name: 'Giant Squid', depth: [400, 1000], info: 'Possessing the largest eyes in the animal kingdom (10 inches diameter), giant squid can detect bioluminescent prey in total darkness.', type: 'squid' },
      { name: 'Vampire Squid', depth: [600, 3000], info: 'Despite its name, it feeds on "marine snow" - falling organic debris. It can turn itself inside out to display defensive spines.', type: 'vampire' },
      { name: 'Anglerfish', depth: [1000, 4000], info: 'Females have bioluminescent lures with symbiotic bacteria. Males are tiny parasites that permanently fuse to females.', type: 'anglerfish' },
      { name: 'Viperfish', depth: [1500, 4000], info: 'Has teeth so long they don\'t fit in its mouth, folding back when it closes. Uses a photophore lure to attract prey.', type: 'viperfish' },
      { name: 'Giant Isopod', depth: [2000, 4000], info: 'Deep-sea scavengers growing to 2.5 feet. They can survive years without food and have been observed eating an entire alligator carcass.', type: 'isopod' },
      { name: 'Dumbo Octopus', depth: [3000, 7000], info: 'Named for Disney\'s elephant, it uses ear-like fins to hover above the seafloor. The deepest-living octopus known.', type: 'dumbo' },
      { name: 'Giant Tube Worms', depth: [4000, 8000], info: 'Living near hydrothermal vents at 176°F, they have no mouth or digestive system, relying entirely on symbiotic bacteria for nutrition.', type: 'tubeworm' },
      { name: 'Deep-Sea Dragonfish', depth: [5000, 8000], info: 'Produces red bioluminescence - rare in the deep sea. This allows it to see prey without being detected by other predators.', type: 'dragonfish' },
      { name: 'Mariana Snailfish', depth: [8000, 11000], info: 'The deepest-living fish discovered. Its body is adapted to pressure 1,000x surface level - soft bones and transparent, gelatinous skin.', type: 'snailfish' }
    ];

    this.init();
  }

  init() {
    // High-quality renderer setup
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x001530, 1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.8;

    document.getElementById('canvas-container').appendChild(this.renderer.domElement);

    this.camera.position.set(0, 0, 30);
    this.camera.fov = 60;

    // Create all elements
    this.createFog();
    this.createLighting();
    this.createUnderwaterEffect();
    this.createSeafloor();
    this.createCoralReefs();
    this.createSeaweed();
    this.createRockFormations();
    this.createFishSchools();
    this.createRealisticFish();
    this.createSeaTurtles();
    this.createSharks();
    this.createWhales();
    this.createJellyfishGroup();
    this.createOctopusGroup();
    this.createSquids();
    this.createDeepSeaCreatures();
    this.createBubbles();
    this.createPlankton();
    this.createCaustics();
    this.createVolumetricLightBeams();

    this.setupEventListeners();
    this.animate();

    setTimeout(() => this.hideLoading(), 2500);
  }

  createFog() {
    this.scene.fog = new THREE.FogExp2(0x001530, 0.003);
  }

  createLighting() {
    // Ambient light - varies with depth
    this.ambientLight = new THREE.AmbientLight(0x003366, 0.4);
    this.scene.add(this.ambientLight);

    // Sun light (from above)
    this.sunLight = new THREE.DirectionalLight(0x00aaff, 0.8);
    this.sunLight.position.set(0, 200, 50);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 500;
    this.sunLight.shadow.camera.left = -100;
    this.sunLight.shadow.camera.right = 100;
    this.sunLight.shadow.camera.top = 100;
    this.sunLight.shadow.camera.bottom = -100;
    this.scene.add(this.sunLight);

    // Hemisphere light for natural sky/ground color blend
    this.hemiLight = new THREE.HemisphereLight(0x00aaff, 0x004466, 0.3);
    this.scene.add(this.hemiLight);
  }

  createUnderwaterEffect() {
    // God rays / volumetric light
    const rayGeometry = new THREE.CylinderGeometry(1, 15, 300, 8, 1, true);
    const rayMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(0x00aaff) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color;
        varying vec2 vUv;
        void main() {
          float alpha = (1.0 - vUv.y) * 0.15;
          alpha *= sin(vUv.x * 10.0 + time) * 0.5 + 0.5;
          alpha *= sin(vUv.y * 3.14159);
          gl_FragColor = vec4(color, alpha * 0.3);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    for (let i = 0; i < 8; i++) {
      const ray = new THREE.Mesh(rayGeometry, rayMaterial.clone());
      ray.position.set(
        (Math.random() - 0.5) * 200,
        150,
        (Math.random() - 0.5) * 150
      );
      ray.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.3;
      ray.rotation.z = (Math.random() - 0.5) * 0.2;
      this.scene.add(ray);
      this.causticLights.push({ mesh: ray, speed: 0.5 + Math.random() * 0.5 });
    }
  }

  createSeafloor() {
    // Create detailed seafloor with displacement
    const floorGeometry = new THREE.PlaneGeometry(800, 800, 200, 200);
    const positions = floorGeometry.attributes.position.array;

    // Generate terrain with multiple noise octaves
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];

      // Multiple frequencies of noise
      let height = 0;
      height += Math.sin(x * 0.02) * Math.cos(y * 0.02) * 15;
      height += Math.sin(x * 0.05 + y * 0.03) * 5;
      height += Math.sin(x * 0.1) * Math.cos(y * 0.08) * 3;
      height += (Math.random() - 0.5) * 2;

      positions[i + 2] = height;
    }

    floorGeometry.computeVertexNormals();
    floorGeometry.computeTangents();

    // Create custom shader material for sandy seafloor
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a4a5a,
      roughness: 0.85,
      metalness: 0.1,
      side: THREE.DoubleSide
    });

    this.seafloor = new THREE.Mesh(floorGeometry, floorMaterial);
    this.seafloor.rotation.x = -Math.PI / 2;
    this.seafloor.position.y = -80;
    this.seafloor.receiveShadow = true;
    this.scene.add(this.seafloor);
  }

  createCoralReefs() {
    const coralTypes = [
      this.createBranchCoral.bind(this),
      this.createBrainCoral.bind(this),
      this.createFanCoral.bind(this),
      this.createTubeCoral.bind(this),
      this.createTableCoral.bind(this)
    ];

    for (let i = 0; i < 80; i++) {
      const coralFunc = coralTypes[Math.floor(Math.random() * coralTypes.length)];
      const coral = coralFunc();

      coral.position.set(
        (Math.random() - 0.5) * 400,
        -78 + Math.random() * 5,
        (Math.random() - 0.5) * 400
      );

      coral.scale.setScalar(0.5 + Math.random() * 1.5);
      coral.rotation.y = Math.random() * Math.PI * 2;

      this.scene.add(coral);
      this.creatures.push({ mesh: coral, type: 'coral', depth: [0, 200] });
    }
  }

  createBranchCoral() {
    const group = new THREE.Group();
    const colors = [0xff6b6b, 0xff9e7a, 0xffd93d, 0x6bcb77, 0xff69b4, 0x9b59b6];

    const material = new THREE.MeshStandardMaterial({
      color: colors[Math.floor(Math.random() * colors.length)],
      roughness: 0.7,
      metalness: 0.1,
      emissive: colors[Math.floor(Math.random() * colors.length)],
      emissiveIntensity: 0.05
    });

    const branchCount = 5 + Math.floor(Math.random() * 8);

    for (let i = 0; i < branchCount; i++) {
      const height = 3 + Math.random() * 8;
      const geometry = new THREE.CylinderGeometry(
        0.15 + Math.random() * 0.2,
        0.4 + Math.random() * 0.3,
        height,
        8
      );

      const branch = new THREE.Mesh(geometry, material);
      branch.position.set(
        (Math.random() - 0.5) * 4,
        height / 2,
        (Math.random() - 0.5) * 4
      );
      branch.rotation.x = (Math.random() - 0.5) * 0.4;
      branch.rotation.z = (Math.random() - 0.5) * 0.4;
      branch.castShadow = true;

      group.add(branch);

      // Add smaller sub-branches
      if (Math.random() > 0.5) {
        const subHeight = height * 0.4;
        const subGeometry = new THREE.CylinderGeometry(0.05, 0.15, subHeight, 6);
        const subBranch = new THREE.Mesh(subGeometry, material);
        subBranch.position.copy(branch.position);
        subBranch.position.y += height * 0.4;
        subBranch.position.x += (Math.random() - 0.5);
        subBranch.rotation.x = (Math.random() - 0.5) * 0.8;
        subBranch.rotation.z = (Math.random() - 0.5) * 0.8;
        group.add(subBranch);
      }
    }

    return group;
  }

  createBrainCoral() {
    const geometry = new THREE.SphereGeometry(2 + Math.random() * 2, 32, 32);
    const positions = geometry.attributes.position.array;

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];

      // Create brain-like ridges
      const noise = Math.sin(x * 3) * Math.cos(y * 3) * 0.3;
      positions[i] += noise * Math.sin(z * 5) * 0.2;
      positions[i + 1] += noise * Math.cos(z * 5) * 0.2;
    }

    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: 0xffd93d,
      roughness: 0.8,
      metalness: 0.1,
      emissive: 0x553300,
      emissiveIntensity: 0.05
    });

    const coral = new THREE.Mesh(geometry, material);
    coral.scale.y = 0.6;
    coral.castShadow = true;

    return coral;
  }

  createFanCoral() {
    const group = new THREE.Group();

    // Main fan structure
    const fanGeometry = new THREE.PlaneGeometry(6, 8, 20, 30);
    const positions = fanGeometry.attributes.position.array;

    // Create wave pattern
    for (let i = 0; i < positions.length; i += 3) {
      const y = positions[i + 1];
      positions[i + 2] = Math.sin(y * 2) * 0.5 + Math.sin(positions[i] * 3) * 0.2;
    }

    fanGeometry.computeVertexNormals();

    const fanMaterial = new THREE.MeshStandardMaterial({
      color: 0xff6b9d,
      side: THREE.DoubleSide,
      roughness: 0.7,
      metalness: 0.1,
      transparent: true,
      opacity: 0.9
    });

    const fan = new THREE.Mesh(fanGeometry, fanMaterial);
    fan.castShadow = true;

    // Stem
    const stemGeometry = new THREE.CylinderGeometry(0.1, 0.3, 3, 8);
    const stemMaterial = new THREE.MeshStandardMaterial({
      color: 0x442200,
      roughness: 0.9
    });
    const stem = new THREE.Mesh(stemGeometry, stemMaterial);
    stem.position.y = -1.5;

    group.add(fan);
    group.add(stem);

    return group;
  }

  createTubeCoral() {
    const group = new THREE.Group();
    const tubeCount = 8 + Math.floor(Math.random() * 12);

    const material = new THREE.MeshStandardMaterial({
      color: 0x44aaff,
      roughness: 0.5,
      metalness: 0.3,
      emissive: 0x004488,
      emissiveIntensity: 0.2
    });

    for (let i = 0; i < tubeCount; i++) {
      const height = 2 + Math.random() * 4;
      const radius = 0.2 + Math.random() * 0.3;

      const geometry = new THREE.CylinderGeometry(radius, radius * 1.2, height, 8, 1, true);
      const tube = new THREE.Mesh(geometry, material);
      tube.position.set(
        (Math.random() - 0.5) * 3,
        height / 2,
        (Math.random() - 0.5) * 3
      );
      tube.castShadow = true;
      group.add(tube);
    }

    return group;
  }

  createTableCoral() {
    const group = new THREE.Group();

    // Stem
    const stemGeometry = new THREE.CylinderGeometry(0.5, 0.8, 4, 8);
    const stemMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b7355,
      roughness: 0.8
    });
    const stem = new THREE.Mesh(stemGeometry, stemMaterial);
    stem.position.y = 2;
    group.add(stem);

    // Table top
    const tableGeometry = new THREE.CylinderGeometry(5, 4, 0.8, 16);
    const tableMaterial = new THREE.MeshStandardMaterial({
      color: 0x66bbaa,
      roughness: 0.6,
      metalness: 0.1
    });
    const table = new THREE.Mesh(tableGeometry, tableMaterial);
    table.position.y = 4.5;
    table.castShadow = true;
    group.add(table);

    return group;
  }

  createSeaweed() {
    for (let i = 0; i < 100; i++) {
      const seaweed = this.createSeaweedStrand();
      seaweed.position.set(
        (Math.random() - 0.5) * 350,
        -78,
        (Math.random() - 0.5) * 350
      );
      seaweed.scale.setScalar(0.5 + Math.random() * 1);
      this.scene.add(seaweed);
    }
  }

  createSeaweedStrand() {
    const group = new THREE.Group();
    const strandCount = 3 + Math.floor(Math.random() * 4);

    for (let s = 0; s < strandCount; s++) {
      const points = [];
      const height = 8 + Math.random() * 15;
      const segments = 20;

      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        points.push(new THREE.Vector3(
          Math.sin(t * Math.PI * 2) * (1 + t * 2),
          t * height,
          Math.cos(t * Math.PI * 3) * (1 + t)
        ));
      }

      const curve = new THREE.CatmullRomCurve3(points);
      const geometry = new THREE.TubeGeometry(curve, segments, 0.15, 8, false);

      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.3 + Math.random() * 0.1, 0.6, 0.25),
        roughness: 0.8,
        side: THREE.DoubleSide
      });

      const strand = new THREE.Mesh(geometry, material);
      strand.position.x = (Math.random() - 0.5) * 2;
      strand.position.z = (Math.random() - 0.5) * 2;
      strand.userData.swayPhase = Math.random() * Math.PI * 2;
      strand.userData.swaySpeed = 0.5 + Math.random() * 0.5;
      group.add(strand);
    }

    return group;
  }

  createRockFormations() {
    for (let i = 0; i < 40; i++) {
      const rock = this.createRock();
      rock.position.set(
        (Math.random() - 0.5) * 400,
        -78 + Math.random() * 2,
        (Math.random() - 0.5) * 400
      );
      rock.scale.setScalar(1 + Math.random() * 3);
      this.scene.add(rock);
    }
  }

  createRock() {
    const geometry = new THREE.DodecahedronGeometry(2 + Math.random() * 2, 1);
    const positions = geometry.attributes.position.array;

    for (let i = 0; i < positions.length; i += 3) {
      positions[i] += (Math.random() - 0.5) * 0.5;
      positions[i + 1] += (Math.random() - 0.5) * 0.5;
      positions[i + 2] += (Math.random() - 0.5) * 0.5;
    }

    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: 0x4a5568,
      roughness: 0.95,
      metalness: 0.1
    });

    const rock = new THREE.Mesh(geometry, material);
    rock.scale.y = 0.6;
    rock.castShadow = true;
    rock.receiveShadow = true;

    return rock;
  }

  // ============================================
  // REALISTIC FISH WITH SKELETAL ANIMATION SYSTEM
  // ============================================

  createFishSchools() {
    // Create multiple schools with different species
    const schoolTypes = [
      { count: 100, size: 0.3, color: 0x4fc3f7, name: 'sardine' },
      { count: 60, size: 0.5, color: 0xffd93d, name: 'tang' },
      { count: 40, size: 0.8, color: 0xff6b6b, name: 'anthias' }
    ];

    schoolTypes.forEach(type => {
      const school = this.createFishSchool(type);
      this.fishSchools.push(school);
    });
  }

  createFishSchool(type) {
    const school = {
      fish: [],
      center: new THREE.Vector3(
        (Math.random() - 0.5) * 150,
        Math.random() * 40 - 20,
        (Math.random() - 0.5) * 150
      ),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        0,
        (Math.random() - 0.5) * 0.3
      )
    };

    for (let i = 0; i < type.count; i++) {
      const fish = this.createRealisticFish(type.size, type.color);

      // Position relative to school center
      fish.position.set(
        school.center.x + (Math.random() - 0.5) * 30,
        school.center.y + (Math.random() - 0.5) * 20,
        school.center.z + (Math.random() - 0.5) * 30
      );

      // Boids parameters
      fish.userData = {
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.05,
          (Math.random() - 0.5) * 0.1
        ),
        phase: Math.random() * Math.PI * 2,
        tailPhase: Math.random() * Math.PI * 2,
        tailSpeed: 5 + Math.random() * 3,
        swimSpeed: 0.02 + Math.random() * 0.02
      };

      this.scene.add(fish);
      school.fish.push(fish);
      this.creatures.push({ mesh: fish, type: 'fish', depth: [0, 500] });
    }

    return school;
  }

  createRealisticFish(size, color) {
    const fish = new THREE.Group();

    // Body - more realistic shape
    const bodyShape = new THREE.Shape();
    bodyShape.moveTo(0, 0);
    bodyShape.bezierCurveTo(-0.5, 0.3, -1, 0.4, -1.5, 0);
    bodyShape.bezierCurveTo(-1, -0.4, -0.5, -0.3, 0, 0);

    const extrudeSettings = {
      steps: 12,
      depth: size * 2,
      bevelEnabled: true,
      bevelThickness: size * 0.3,
      bevelSize: size * 0.2,
      bevelSegments: 8
    };

    const bodyGeometry = new THREE.ExtrudeGeometry(bodyShape, extrudeSettings);
    bodyGeometry.scale(size, size, size);
    bodyGeometry.rotateY(Math.PI / 2);
    bodyGeometry.translate(size, 0, 0);

    // Create material with iridescence effect
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.7,
      roughness: 0.2,
      emissive: color,
      emissiveIntensity: 0.1
    });

    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    fish.add(body);

    // Tail fin with realistic shape
    const tailGeometry = new THREE.BufferGeometry();
    const tailVertices = new Float32Array([
      0, 0, 0,
      -size * 1.5, size * 0.8, 0,
      -size * 1.2, 0, 0,
      0, 0, 0,
      -size * 1.5, -size * 0.8, 0,
      -size * 1.2, 0, 0
    ]);
    tailGeometry.setAttribute('position', new THREE.BufferAttribute(tailVertices, 3));
    tailGeometry.computeVertexNormals();

    const tailMaterial = new THREE.MeshStandardMaterial({
      color: color,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      metalness: 0.5,
      roughness: 0.3
    });

    const tail = new THREE.Mesh(tailGeometry, tailMaterial);
    tail.position.x = -size * 1.2;
    fish.add(tail);
    fish.userData.tail = tail;

    // Dorsal fin
    const dorsalGeometry = new THREE.BufferGeometry();
    const dorsalVertices = new Float32Array([
      0, 0, 0,
      size * 0.3, size * 0.6, 0,
      size * 0.8, size * 0.4, 0,
      size * 0.6, 0, 0
    ]);
    dorsalGeometry.setAttribute('position', new THREE.BufferAttribute(dorsalVertices, 3));
    dorsalGeometry.computeVertexNormals();

    const dorsal = new THREE.Mesh(dorsalGeometry, tailMaterial);
    dorsal.position.set(size * 0.3, size * 0.2, 0);
    fish.add(dorsal);

    // Pectoral fins
    const pectoralGeometry = new THREE.CircleGeometry(size * 0.4, 8);
    const pectoralMaterial = new THREE.MeshStandardMaterial({
      color: color,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });

    const pectoralLeft = new THREE.Mesh(pectoralGeometry, pectoralMaterial);
    pectoralLeft.position.set(size * 0.3, -size * 0.1, size * 0.3);
    pectoralLeft.rotation.x = Math.PI / 2 + 0.3;
    fish.add(pectoralLeft);

    const pectoralRight = new THREE.Mesh(pectoralGeometry.clone(), pectoralMaterial);
    pectoralRight.position.set(size * 0.3, -size * 0.1, -size * 0.3);
    pectoralRight.rotation.x = -Math.PI / 2 - 0.3;
    fish.add(pectoralRight);

    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(size * 0.12, 8, 8);
    const eyeMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.3
    });

    const pupilGeometry = new THREE.SphereGeometry(size * 0.06, 8, 8);
    const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });

    const eyeLeft = new THREE.Group();
    eyeLeft.add(new THREE.Mesh(eyeGeometry, eyeMaterial));
    const pupilLeft = new THREE.Mesh(pupilGeometry, pupilMaterial);
    pupilLeft.position.z = size * 0.08;
    eyeLeft.add(pupilLeft);
    eyeLeft.position.set(size * 0.8, size * 0.1, size * 0.25);
    fish.add(eyeLeft);

    const eyeRight = eyeLeft.clone();
    eyeRight.position.set(size * 0.8, size * 0.1, -size * 0.25);
    fish.add(eyeRight);

    return fish;
  }

  // ============================================
  // SEA TURTLE
  // ============================================

  createSeaTurtles() {
    for (let i = 0; i < 4; i++) {
      const turtle = this.createSeaTurtle();
      turtle.position.set(
        (Math.random() - 0.5) * 150,
        Math.random() * 30 - 15,
        (Math.random() - 0.5) * 150
      );
      turtle.userData = {
        velocity: new THREE.Vector3(0.02 + Math.random() * 0.03, 0, (Math.random() - 0.5) * 0.01),
        flapPhase: Math.random() * Math.PI * 2,
        swimDepth: Math.random() * 50 - 25
      };
      this.scene.add(turtle);
      this.creatures.push({ mesh: turtle, type: 'turtle', depth: [0, 350] });
    }
  }

  createSeaTurtle() {
    const turtle = new THREE.Group();

    // Shell
    const shellGeometry = new THREE.SphereGeometry(2, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const shellMaterial = new THREE.MeshStandardMaterial({
      color: 0x2d5a27,
      roughness: 0.8,
      metalness: 0.1
    });
    const shell = new THREE.Mesh(shellGeometry, shellMaterial);
    shell.scale.set(1, 0.6, 1.2);
    shell.position.y = 0.3;
    turtle.add(shell);

    // Shell pattern
    const patternMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a3518,
      roughness: 0.9
    });
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const pattern = new THREE.Mesh(
        new THREE.CircleGeometry(0.6, 6),
        patternMaterial
      );
      pattern.position.set(
        Math.cos(angle) * 1.2,
        0.8,
        Math.sin(angle) * 1.4
      );
      pattern.rotation.x = -Math.PI / 2;
      turtle.add(pattern);
    }

    // Head
    const headGeometry = new THREE.SphereGeometry(0.5, 12, 12);
    headGeometry.scale(1.5, 0.8, 0.8);
    const skinMaterial = new THREE.MeshStandardMaterial({
      color: 0x3d6b37,
      roughness: 0.7
    });
    const head = new THREE.Mesh(headGeometry, skinMaterial);
    head.position.set(2.5, 0.2, 0);
    turtle.add(head);

    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.12, 8, 8);
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const eyeLeft = new THREE.Mesh(eyeGeometry, eyeMaterial);
    eyeLeft.position.set(2.8, 0.4, 0.3);
    turtle.add(eyeLeft);
    const eyeRight = eyeLeft.clone();
    eyeRight.position.z = -0.3;
    turtle.add(eyeRight);

    // Flippers
    const flipperGeometry = new THREE.BoxGeometry(1.5, 0.15, 0.6);
    const frontLeftFlipper = new THREE.Mesh(flipperGeometry, skinMaterial);
    frontLeftFlipper.position.set(0.5, 0.1, 1.8);
    frontLeftFlipper.rotation.z = -0.3;
    turtle.add(frontLeftFlipper);
    turtle.userData.frontLeftFlipper = frontLeftFlipper;

    const frontRightFlipper = new THREE.Mesh(flipperGeometry, skinMaterial);
    frontRightFlipper.position.set(0.5, 0.1, -1.8);
    frontRightFlipper.rotation.z = 0.3;
    turtle.add(frontRightFlipper);
    turtle.userData.frontRightFlipper = frontRightFlipper;

    // Back flippers
    const backFlipperGeometry = new THREE.BoxGeometry(0.8, 0.1, 0.5);
    const backLeftFlipper = new THREE.Mesh(backFlipperGeometry, skinMaterial);
    backLeftFlipper.position.set(-1.8, 0.1, 1.2);
    turtle.add(backLeftFlipper);

    const backRightFlipper = new THREE.Mesh(backFlipperGeometry, skinMaterial);
    backRightFlipper.position.set(-1.8, 0.1, -1.2);
    turtle.add(backRightFlipper);

    // Tail
    const tailGeometry = new THREE.ConeGeometry(0.15, 0.8, 6);
    tailGeometry.rotateZ(Math.PI / 2);
    const tail = new THREE.Mesh(tailGeometry, skinMaterial);
    tail.position.set(-2.5, 0.1, 0);
    turtle.add(tail);

    return turtle;
  }

  // ============================================
  // SHARK
  // ============================================

  createSharks() {
    for (let i = 0; i < 3; i++) {
      const shark = this.createShark();
      shark.position.set(
        (Math.random() - 0.5) * 200,
        Math.random() * 40 - 20,
        (Math.random() - 0.5) * 200
      );
      shark.userData = {
        velocity: new THREE.Vector3(0.03 + Math.random() * 0.02, 0, (Math.random() - 0.5) * 0.01),
        tailPhase: Math.random() * Math.PI * 2,
        patrolRange: 100 + Math.random() * 50
      };
      this.scene.add(shark);
      this.sharks.push(shark);
      this.creatures.push({ mesh: shark, type: 'shark', depth: [0, 1500] });
    }
  }

  createShark() {
    const shark = new THREE.Group();

    // Body - torpedo shape
    const bodyGeometry = new THREE.CylinderGeometry(0.8, 0.4, 6, 12);
    bodyGeometry.rotateZ(Math.PI / 2);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a5568,
      roughness: 0.4,
      metalness: 0.2
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.scale.set(1.5, 1, 1);
    shark.add(body);

    // Snout
    const snoutGeometry = new THREE.ConeGeometry(0.6, 2, 12);
    snoutGeometry.rotateZ(-Math.PI / 2);
    const snout = new THREE.Mesh(snoutGeometry, bodyMaterial);
    snout.position.x = 5;
    shark.add(snout);

    // Dorsal fin
    const dorsalGeometry = new THREE.BufferGeometry();
    const dorsalVertices = new Float32Array([
      0, 0, 0,
      0.3, 1.5, 0,
      1.5, 0, 0
    ]);
    dorsalGeometry.setAttribute('position', new THREE.BufferAttribute(dorsalVertices, 3));
    dorsalGeometry.computeVertexNormals();

    const finMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a4558,
      side: THREE.DoubleSide,
      roughness: 0.5
    });

    const dorsalFin = new THREE.Mesh(dorsalGeometry, finMaterial);
    dorsalFin.position.set(0, 0.8, 0);
    shark.add(dorsalFin);

    // Pectoral fins
    const pectoralGeometry = new THREE.BufferGeometry();
    const pectoralVertices = new Float32Array([
      0, 0, 0,
      0.2, 0.8, 1.5,
      1.5, 0.3, 0.5
    ]);
    pectoralGeometry.setAttribute('position', new THREE.BufferAttribute(pectoralVertices, 3));
    pectoralGeometry.computeVertexNormals();

    const pectoralLeft = new THREE.Mesh(pectoralGeometry, finMaterial);
    pectoralLeft.position.set(1, -0.3, 0.8);
    shark.add(pectoralLeft);

    const pectoralRight = new THREE.Mesh(pectoralGeometry.clone(), finMaterial);
    pectoralRight.position.set(1, -0.3, -0.8);
    pectoralRight.scale.z = -1;
    shark.add(pectoralRight);

    // Tail fin
    const tailGeometry = new THREE.BufferGeometry();
    const tailVertices = new Float32Array([
      0, 0, 0,
      -0.5, 1.2, 0,
      -2, 0, 0,
      -0.5, -0.8, 0
    ]);
    tailGeometry.setAttribute('position', new THREE.BufferAttribute(tailVertices, 3));
    tailGeometry.computeVertexNormals();

    const tailFin = new THREE.Mesh(tailGeometry, finMaterial);
    tailFin.position.x = -4;
    shark.add(tailFin);
    shark.userData.tailFin = tailFin;

    // Second dorsal fin
    const secondDorsalGeometry = new THREE.BufferGeometry();
    const secondDorsalVertices = new Float32Array([
      0, 0, 0,
      0.2, 0.5, 0,
      0.8, 0, 0
    ]);
    secondDorsalGeometry.setAttribute('position', new THREE.BufferAttribute(secondDorsalVertices, 3));
    secondDorsalGeometry.computeVertexNormals();

    const secondDorsal = new THREE.Mesh(secondDorsalGeometry, finMaterial);
    secondDorsal.position.set(-2, 0.5, 0);
    shark.add(secondDorsal);

    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.12, 8, 8);
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 });

    const eyeLeft = new THREE.Mesh(eyeGeometry, eyeMaterial);
    eyeLeft.position.set(4.5, 0.3, 0.6);
    shark.add(eyeLeft);

    const eyeRight = eyeLeft.clone();
    eyeRight.position.z = -0.6;
    shark.add(eyeRight);

    // Gills
    const gillMaterial = new THREE.MeshBasicMaterial({ color: 0x2a3548 });
    for (let i = 0; i < 5; i++) {
      const gillLeft = new THREE.Mesh(
        new THREE.PlaneGeometry(0.05, 0.3),
        gillMaterial
      );
      gillLeft.position.set(2.5 - i * 0.2, 0, 0.75);
      gillLeft.rotation.y = Math.PI / 2;
      shark.add(gillLeft);

      const gillRight = gillLeft.clone();
      gillRight.position.z = -0.75;
      shark.add(gillRight);
    }

    shark.scale.setScalar(1.5);

    return shark;
  }

  // ============================================
  // WHALE
  // ============================================

  createWhales() {
    for (let i = 0; i < 2; i++) {
      const whale = this.createWhale();
      whale.position.set(
        (Math.random() - 0.5) * 300,
        Math.random() * 30 - 50,
        (Math.random() - 0.5) * 300
      );
      whale.userData = {
        velocity: new THREE.Vector3(0.01 + Math.random() * 0.01, 0, (Math.random() - 0.5) * 0.005),
        tailPhase: Math.random() * Math.PI * 2,
        swimCycle: 0
      };
      this.scene.add(whale);
      this.whales.push(whale);
      this.creatures.push({ mesh: whale, type: 'whale', depth: [0, 600] });
    }
  }

  createWhale() {
    const whale = new THREE.Group();

    // Body
    const bodyGeometry = new THREE.SphereGeometry(8, 32, 24);
    bodyGeometry.scale(2, 0.6, 0.5);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x2c3e50,
      roughness: 0.6,
      metalness: 0.1
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    whale.add(body);

    // Head
    const headGeometry = new THREE.SphereGeometry(5, 24, 16);
    headGeometry.scale(1.2, 0.7, 0.6);
    const head = new THREE.Mesh(headGeometry, bodyMaterial);
    head.position.x = 12;
    whale.add(head);

    // Throat grooves
    const grooveMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a2530,
      roughness: 0.8
    });
    for (let i = 0; i < 20; i++) {
      const groove = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 15, 6),
        grooveMaterial
      );
      groove.position.set(5, -2, (i - 10) * 0.5);
      groove.rotation.z = Math.PI / 2;
      whale.add(groove);
    }

    // Tail fluke
    const flukeGeometry = new THREE.BoxGeometry(8, 0.5, 12);
    const flukeMaterial = new THREE.MeshStandardMaterial({
      color: 0x2c3e50,
      roughness: 0.6
    });
    const fluke = new THREE.Mesh(flukeGeometry, flukeMaterial);
    fluke.position.x = -15;
    whale.add(fluke);

    // Dorsal fin (small for blue whale)
    const dorsalGeometry = new THREE.ConeGeometry(0.5, 2, 8);
    const dorsal = new THREE.Mesh(dorsalGeometry, bodyMaterial);
    dorsal.position.set(-8, 3, 0);
    dorsal.rotation.z = 0.3;
    whale.add(dorsal);

    // Pectoral fins
    const pectoralGeometry = new THREE.ConeGeometry(1.5, 5, 8);
    pectoralGeometry.rotateZ(Math.PI / 2);

    const pectoralLeft = new THREE.Mesh(pectoralGeometry, bodyMaterial);
    pectoralLeft.position.set(5, -2, 5);
    pectoralLeft.rotation.x = 0.3;
    whale.add(pectoralLeft);

    const pectoralRight = new THREE.Mesh(pectoralGeometry, bodyMaterial);
    pectoralRight.position.set(5, -2, -5);
    pectoralRight.rotation.x = -0.3;
    whale.add(pectoralRight);

    // Eye
    const eyeGeometry = new THREE.SphereGeometry(0.4, 8, 8);
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const eyeLeft = new THREE.Mesh(eyeGeometry, eyeMaterial);
    eyeLeft.position.set(14, 1, 4);
    whale.add(eyeLeft);
    const eyeRight = eyeLeft.clone();
    eyeRight.position.z = -4;
    whale.add(eyeRight);

    whale.scale.setScalar(0.5);

    return whale;
  }

  // ============================================
  // JELLYFISH
  // ============================================

  createJellyfishGroup() {
    for (let i = 0; i < 40; i++) {
      const jelly = this.createJellyfish();
      jelly.position.set(
        (Math.random() - 0.5) * 200,
        Math.random() * 80 - 40,
        (Math.random() - 0.5) * 200
      );
      jelly.userData = {
        pulsePhase: Math.random() * Math.PI * 2,
        floatSpeed: 0.2 + Math.random() * 0.3,
        originalY: jelly.position.y,
        driftAngle: Math.random() * Math.PI * 2
      };
      this.scene.add(jelly);
      this.jellyfish.push(jelly);
      this.creatures.push({ mesh: jelly, type: 'jellyfish', depth: [50, 2000] });
    }
  }

  createJellyfish() {
    const jelly = new THREE.Group();

    // Bell with realistic geometry
    const bellSegments = 32;
    const bellRings = 16;
    const bellGeometry = new THREE.SphereGeometry(1.5, bellSegments, bellRings, 0, Math.PI * 2, 0, Math.PI / 2);

    const bellPositions = bellGeometry.attributes.position.array;
    for (let i = 0; i < bellPositions.length; i += 3) {
      const y = bellPositions[i + 1];
      if (y < 0) {
        bellPositions[i + 1] = y * 0.6; // Flatten bottom
      }
    }
    bellGeometry.computeVertexNormals();

    const bellMaterial = new THREE.MeshStandardMaterial({
      color: 0xff69b4,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      emissive: 0xff69b4,
      emissiveIntensity: 0.2,
      roughness: 0.3,
      metalness: 0.1
    });

    const bell = new THREE.Mesh(bellGeometry, bellMaterial);
    jelly.add(bell);
    jelly.userData.bell = bell;

    // Oral arms (center)
    const armCount = 4;
    for (let i = 0; i < armCount; i++) {
      const points = [];
      const segments = 20;
      for (let j = 0; j <= segments; j++) {
        const t = j / segments;
        points.push(new THREE.Vector3(
          Math.sin(t * Math.PI * 4 + i) * 0.3 * t,
          -t * 3,
          Math.cos(t * Math.PI * 4 + i) * 0.3 * t
        ));
      }
      const curve = new THREE.CatmullRomCurve3(points);
      const armGeometry = new THREE.TubeGeometry(curve, segments, 0.08, 8, false);
      const armMaterial = new THREE.MeshStandardMaterial({
        color: 0xff69b4,
        transparent: true,
        opacity: 0.5,
        emissive: 0xff69b4,
        emissiveIntensity: 0.15
      });
      const arm = new THREE.Mesh(armGeometry, armMaterial);
      jelly.add(arm);
    }

    // Tentacles
    const tentacleCount = 24;
    jelly.userData.tentacles = [];
    for (let i = 0; i < tentacleCount; i++) {
      const angle = (i / tentacleCount) * Math.PI * 2;
      const radius = 1.2 + Math.random() * 0.3;

      const points = [];
      const length = 4 + Math.random() * 3;
      const segments = 30;

      for (let j = 0; j <= segments; j++) {
        const t = j / segments;
        const wave = Math.sin(t * Math.PI * 6 + i) * 0.3 * t;
        points.push(new THREE.Vector3(
          Math.cos(angle) * radius * (1 - t * 0.3) + wave,
          -t * length,
          Math.sin(angle) * radius * (1 - t * 0.3) + wave
        ));
      }

      const curve = new THREE.CatmullRomCurve3(points);
      const tentacleGeometry = new THREE.TubeGeometry(curve, segments, 0.03, 6, false);
      const tentacleMaterial = new THREE.MeshStandardMaterial({
        color: 0xff88cc,
        transparent: true,
        opacity: 0.4,
        emissive: 0xff88cc,
        emissiveIntensity: 0.1
      });

      const tentacle = new THREE.Mesh(tentacleGeometry, tentacleMaterial);
      jelly.add(tentacle);
      jelly.userData.tentacles.push({ mesh: tentacle, originalPoints: points });
    }

    // Bioluminescent glow
    const glowGeometry = new THREE.SphereGeometry(2, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xff69b4,
      transparent: true,
      opacity: 0.15
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.scale.set(1, 0.6, 1);
    jelly.add(glow);

    // Point light
    const light = new THREE.PointLight(0xff69b4, 0.5, 10);
    light.position.y = -0.5;
    jelly.add(light);
    jelly.userData.light = light;

    return jelly;
  }

  // ============================================
  // OCTOPUS
  // ============================================

  createOctopusGroup() {
    for (let i = 0; i < 3; i++) {
      const octopus = this.createOctopus();
      octopus.position.set(
        (Math.random() - 0.5) * 150,
        Math.random() * 30 - 60,
        (Math.random() - 0.5) * 150
      );
      octopus.userData = {
        phase: Math.random() * Math.PI * 2,
        crawlSpeed: 0.02 + Math.random() * 0.02
      };
      this.scene.add(octopus);
      this.creatures.push({ mesh: octopus, type: 'octopus', depth: [50, 1500] });
    }
  }

  createOctopus() {
    const octopus = new THREE.Group();

    // Mantle
    const mantleGeometry = new THREE.SphereGeometry(1.5, 24, 16);
    mantleGeometry.scale(1, 1.3, 1);
    const material = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.7,
      metalness: 0.1
    });
    const mantle = new THREE.Mesh(mantleGeometry, material);
    mantle.position.y = 1;
    octopus.add(mantle);

    // Head
    const headGeometry = new THREE.SphereGeometry(1.2, 24, 16);
    const head = new THREE.Mesh(headGeometry, material);
    head.position.set(0, 0.5, 1);
    octopus.add(head);

    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.25, 12, 12);
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0xffd700 });
    const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });

    const eyeLeft = new THREE.Group();
    eyeLeft.add(new THREE.Mesh(eyeGeometry, eyeMaterial));
    const pupilLeft = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), pupilMaterial);
    pupilLeft.position.z = 0.2;
    eyeLeft.add(pupilLeft);
    eyeLeft.position.set(0.6, 0.5, 1.8);
    octopus.add(eyeLeft);

    const eyeRight = eyeLeft.clone();
    eyeRight.position.x = -0.6;
    octopus.add(eyeRight);

    // Arms
    octopus.userData.arms = [];
    for (let i = 0; i < 8; i++) {
      const arm = this.createOctopusArm();
      const angle = (i / 8) * Math.PI * 2;
      arm.position.set(Math.cos(angle) * 0.8, -0.5, Math.sin(angle) * 0.8 + 0.5);
      arm.rotation.x = Math.PI / 2 + 0.3;
      arm.rotation.z = angle;
      arm.userData.baseAngle = angle;
      octopus.add(arm);
      octopus.userData.arms.push(arm);
    }

    octopus.scale.setScalar(0.8);

    return octopus;
  }

  createOctopusArm() {
    const arm = new THREE.Group();

    const points = [];
    const segments = 30;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      points.push(new THREE.Vector3(0, 0, t * 4));
    }

    const curve = new THREE.CatmullRomCurve3(points);
    const geometry = new THREE.TubeGeometry(curve, segments, 0.2 * 0.85, 12, false);
    const material = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.7
    });

    const tube = new THREE.Mesh(geometry, material);
    arm.add(tube);

    // Suckers
    for (let i = 2; i < segments; i += 2) {
      const t = i / segments;
      const suckerGeometry = new THREE.TorusGeometry(0.1 - t * 0.07, 0.03, 6, 12);
      const suckerMaterial = new THREE.MeshStandardMaterial({ color: 0xdeb887 });
      const sucker = new THREE.Mesh(suckerGeometry, suckerMaterial);
      sucker.position.z = t * 4;
      sucker.rotation.x = Math.PI / 2;
      arm.add(sucker);
    }

    return arm;
  }

  // ============================================
  // SQUID
  // ============================================

  createSquids() {
    for (let i = 0; i < 5; i++) {
      const squid = this.createSquid();
      squid.position.set(
        (Math.random() - 0.5) * 150,
        Math.random() * 60 - 40,
        (Math.random() - 0.5) * 150
      );
      squid.userData = {
        velocity: new THREE.Vector3(0, -0.01, 0),
        jetPhase: Math.random() * Math.PI * 2,
        originalY: squid.position.y
      };
      this.scene.add(squid);
      this.creatures.push({ mesh: squid, type: 'squid', depth: [200, 1500] });
    }
  }

  createSquid() {
    const squid = new THREE.Group();

    // Mantle
    const mantleGeometry = new THREE.ConeGeometry(1, 4, 16, 1, true);
    const material = new THREE.MeshStandardMaterial({
      color: 0x8b4789,
      roughness: 0.6,
      metalness: 0.1,
      side: THREE.DoubleSide
    });
    const mantle = new THREE.Mesh(mantleGeometry, material);
    mantle.position.y = 2;
    squid.add(mantle);

    // Fins
    const finGeometry = new THREE.CircleGeometry(1.5, 16, 0, Math.PI);
    const finMaterial = new THREE.MeshStandardMaterial({
      color: 0x9b599b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    const finLeft = new THREE.Mesh(finGeometry, finMaterial);
    finLeft.position.set(0, 3.5, 0);
    finLeft.rotation.x = Math.PI / 2;
    finLeft.rotation.z = Math.PI / 4;
    squid.add(finLeft);

    const finRight = new THREE.Mesh(finGeometry, finMaterial);
    finRight.position.set(0, 3.5, 0);
    finRight.rotation.x = Math.PI / 2;
    finRight.rotation.z = -Math.PI / 4;
    squid.add(finRight);

    // Head
    const headGeometry = new THREE.SphereGeometry(0.8, 16, 16);
    const head = new THREE.Mesh(headGeometry, material);
    head.position.y = -0.5;
    squid.add(head);

    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.4, 12, 12);
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0xffd700 });
    const eyeLeft = new THREE.Mesh(eyeGeometry, eyeMaterial);
    eyeLeft.position.set(0.6, -0.3, 0.5);
    squid.add(eyeLeft);
    const eyeRight = eyeLeft.clone();
    eyeRight.position.x = -0.6;
    squid.add(eyeRight);

    // Tentacles (2 long + 8 short)
    squid.userData.tentacles = [];
    for (let i = 0; i < 10; i++) {
      const length = i < 2 ? 8 : 3;
      const tentacle = this.createTentacle(length);
      const angle = (i / 10) * Math.PI * 2;
      tentacle.position.set(Math.cos(angle) * 0.6, -1, Math.sin(angle) * 0.6);
      tentacle.rotation.x = Math.PI / 2 + 0.5;
      squid.add(tentacle);
      squid.userData.tentacles.push(tentacle);
    }

    return squid;
  }

  createTentacle(length) {
    const tentacle = new THREE.Group();
    const segments = 20;

    const points = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      points.push(new THREE.Vector3(0, t * length, 0));
    }

    const curve = new THREE.CatmullRomCurve3(points);
    const geometry = new THREE.TubeGeometry(curve, segments, 0.1, 8, false);
    const material = new THREE.MeshStandardMaterial({
      color: 0x9b599b,
      roughness: 0.6
    });

    const tube = new THREE.Mesh(geometry, material);
    tentacle.add(tube);

    // Suckers with hooks
    for (let i = 2; i < segments; i += 2) {
      const t = i / segments;
      const suckerGeometry = new THREE.TorusGeometry(0.06, 0.02, 6, 8);
      const suckerMaterial = new THREE.MeshStandardMaterial({ color: 0xdda0dd });
      const sucker = new THREE.Mesh(suckerGeometry, suckerMaterial);
      sucker.position.y = t * length;
      sucker.rotation.x = Math.PI / 2;
      tentacle.add(sucker);
    }

    return tentacle;
  }

  // ============================================
  // DEEP SEA CREATURES
  // ============================================

  createDeepSeaCreatures() {
    // Anglerfish
    for (let i = 0; i < 8; i++) {
      const angler = this.createAnglerfish();
      angler.position.set(
        (Math.random() - 0.5) * 150,
        -40 - Math.random() * 40,
        (Math.random() - 0.5) * 150
      );
      angler.userData = {
        pulsePhase: Math.random() * Math.PI * 2,
        swimSpeed: 0.005 + Math.random() * 0.005
      };
      this.scene.add(angler);
      this.deepSeaCreatures.push(angler);
      this.creatures.push({ mesh: angler, type: 'deepsea', depth: [800, 8000] });
    }

    // Dumbo octopus
    for (let i = 0; i < 4; i++) {
      const dumbo = this.createDumboOctopus();
      dumbo.position.set(
        (Math.random() - 0.5) * 100,
        -50 - Math.random() * 30,
        (Math.random() - 0.5) * 100
      );
      dumbo.userData = {
        phase: Math.random() * Math.PI * 2,
        originalY: dumbo.position.y
      };
      this.scene.add(dumbo);
      this.creatures.push({ mesh: dumbo, type: 'deepsea', depth: [3000, 7000] });
    }
  }

  createAnglerfish() {
    const angler = new THREE.Group();

    // Body
    const bodyGeometry = new THREE.SphereGeometry(2, 16, 16);
    bodyGeometry.scale(1, 0.8, 0.9);
    const material = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.9,
      metalness: 0.1
    });
    const body = new THREE.Mesh(bodyGeometry, material);
    angler.add(body);

    // Huge jaw
    const jawGeometry = new THREE.SphereGeometry(1.5, 12, 12, 0, Math.PI);
    jawGeometry.scale(1.5, 1, 1);
    const jaw = new THREE.Mesh(jawGeometry, material);
    jaw.position.set(1.5, -0.5, 0);
    jaw.rotation.z = -Math.PI / 2;
    angler.add(jaw);

    // Teeth
    const toothMaterial = new THREE.MeshStandardMaterial({ color: 0xfffff0 });
    for (let i = 0; i < 20; i++) {
      const tooth = new THREE.Mesh(
        new THREE.ConeGeometry(0.05, 0.4, 4),
        toothMaterial
      );
      const angle = (i / 20) * Math.PI * 2;
      tooth.position.set(
        2.5 + Math.cos(angle) * 0.3,
        -0.3 + Math.sin(angle) * 0.3,
        Math.sin(angle) * 1
      );
      tooth.rotation.z = Math.PI / 2;
      angler.add(tooth);
    }

    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.3, 12, 12);
    const eyeMaterial = new THREE.MeshStandardMaterial({
      color: 0x000000,
      emissive: 0x001122,
      emissiveIntensity: 0.5
    });
    const eyeLeft = new THREE.Mesh(eyeGeometry, eyeMaterial);
    eyeLeft.position.set(0.5, 0.5, 1.5);
    angler.add(eyeLeft);
    const eyeRight = eyeLeft.clone();
    eyeRight.position.z = -1.5;
    angler.add(eyeRight);

    // Lure (illicium + esca)
    const illiciumGeometry = new THREE.CylinderGeometry(0.05, 0.02, 4, 8);
    const illiciumMaterial = new THREE.MeshStandardMaterial({ color: 0x222233 });
    const illicium = new THREE.Mesh(illiciumGeometry, illiciumMaterial);
    illicium.position.set(0, 2.5, 0.5);
    illicium.rotation.x = -0.3;
    angler.add(illicium);

    // Glowing esca (lure)
    const escaGeometry = new THREE.SphereGeometry(0.4, 12, 12);
    const escaMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 2,
      transparent: true,
      opacity: 0.9
    });
    const esca = new THREE.Mesh(escaGeometry, escaMaterial);
    esca.position.set(0, 4.5, 0.8);
    angler.add(esca);
    angler.userData.esca = esca;
    angler.userData.escaMaterial = escaMaterial;

    // Point light for lure
    const lureLight = new THREE.PointLight(0x00ffff, 2, 15);
    lureLight.position.copy(esca.position);
    angler.add(lureLight);
    angler.userData.lureLight = lureLight;

    // Fins
    const finGeometry = new THREE.CircleGeometry(1, 8, 0, Math.PI / 2);
    const finMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });

    const pectoralLeft = new THREE.Mesh(finGeometry, finMaterial);
    pectoralLeft.position.set(-0.5, -0.3, 1.8);
    pectoralLeft.rotation.x = Math.PI / 4;
    angler.add(pectoralLeft);

    const pectoralRight = pectoralLeft.clone();
    pectoralRight.position.z = -1.8;
    angler.add(pectoralRight);

    return angler;
  }

  createDumboOctopus() {
    const dumbo = new THREE.Group();

    // Body
    const bodyGeometry = new THREE.SphereGeometry(1, 16, 16);
    bodyGeometry.scale(1, 1.3, 1);
    const material = new THREE.MeshStandardMaterial({
      color: 0xff9999,
      roughness: 0.5,
      metalness: 0.1,
      emissive: 0xff5555,
      emissiveIntensity: 0.1
    });
    const body = new THREE.Mesh(bodyGeometry, material);
    dumbo.add(body);

    // Ear fins
    const earGeometry = new THREE.CircleGeometry(1.2, 16);
    const earMaterial = new THREE.MeshStandardMaterial({
      color: 0xffaaaa,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7
    });

    const earLeft = new THREE.Mesh(earGeometry, earMaterial);
    earLeft.position.set(0, 0.5, 1);
    earLeft.rotation.y = Math.PI / 4;
    dumbo.add(earLeft);
    dumbo.userData.earLeft = earLeft;

    const earRight = new THREE.Mesh(earGeometry, earMaterial);
    earRight.position.set(0, 0.5, -1);
    earRight.rotation.y = -Math.PI / 4;
    dumbo.add(earRight);
    dumbo.userData.earRight = earRight;

    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.2, 12, 12);
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0xffd700 });
    const eyeLeft = new THREE.Mesh(eyeGeometry, eyeMaterial);
    eyeLeft.position.set(0.5, 0.3, 0.6);
    dumbo.add(eyeLeft);
    const eyeRight = eyeLeft.clone();
    eyeRight.position.set(-0.5, 0.3, 0.6);
    dumbo.add(eyeRight);

    // Tentacles
    for (let i = 0; i < 8; i++) {
      const tentacle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.02, 2, 8),
        material
      );
      const angle = (i / 8) * Math.PI * 2;
      tentacle.position.set(Math.cos(angle) * 0.5, -1, Math.sin(angle) * 0.5);
      tentacle.rotation.x = Math.PI / 2 + 0.5;
      dumbo.add(tentacle);
    }

    return dumbo;
  }

  createBubbles() {
    const bubbleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const bubbleMaterial = new THREE.MeshStandardMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.3,
      roughness: 0.1,
      metalness: 0.5
    });

    for (let i = 0; i < 150; i++) {
      const bubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial.clone());
      bubble.position.set(
        (Math.random() - 0.5) * 300,
        Math.random() * 150 - 100,
        (Math.random() - 0.5) * 300
      );
      bubble.scale.setScalar(0.3 + Math.random() * 1.5);

      bubble.userData = {
        speed: 0.03 + Math.random() * 0.07,
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleSpeed: 1 + Math.random() * 2
      };

      this.scene.add(bubble);
      this.bubbles.push(bubble);
    }
  }

  createPlankton() {
    const planktonGeometry = new THREE.SphereGeometry(0.02, 4, 4);

    for (let i = 0; i < 800; i++) {
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.5 + Math.random() * 0.2, 0.8, 0.5),
        transparent: true,
        opacity: 0.4
      });

      const plankton = new THREE.Mesh(planktonGeometry, material);
      plankton.position.set(
        (Math.random() - 0.5) * 400,
        Math.random() * 200 - 100,
        (Math.random() - 0.5) * 400
      );

      plankton.userData = {
        originalPos: plankton.position.clone(),
        speed: 0.5 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2
      };

      this.scene.add(plankton);
      this.plankton.push(plankton);
    }
  }

  createCaustics() {
    // Animated caustic patterns on seafloor
    const causticGeometry = new THREE.PlaneGeometry(200, 200, 64, 64);

    const causticMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(0x00aaff) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color;
        varying vec2 vUv;

        float caustic(vec2 uv, float t) {
          float c = 0.0;
          for (int i = 0; i < 3; i++) {
            float scale = 1.0 + float(i) * 2.0;
            c += sin(uv.x * scale * 10.0 + t) * sin(uv.y * scale * 10.0 + t * 0.7);
          }
          return c / 3.0;
        }

        void main() {
          float c = caustic(vUv, time);
          c = (c + 1.0) * 0.5;
          gl_FragColor = vec4(color, c * 0.15);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.causticPlane = new THREE.Mesh(causticGeometry, causticMaterial);
    this.causticPlane.rotation.x = -Math.PI / 2;
    this.causticPlane.position.y = -77;
    this.scene.add(this.causticPlane);
  }

  createVolumetricLightBeams() {
    // Already created in createUnderwaterEffect
  }

  setupEventListeners() {
    document.addEventListener('mousemove', (e) => {
      this.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouseY = (e.clientY / window.innerHeight) * 2 - 1;
    });

    document.addEventListener('wheel', (e) => {
      this.targetDepth += e.deltaY * 0.5;
      this.targetDepth = Math.max(0, Math.min(this.maxDepth, this.targetDepth));
    });

    let touchStartY = 0;
    document.addEventListener('touchstart', (e) => {
      touchStartY = e.touches[0].clientY;
    });
    document.addEventListener('touchmove', (e) => {
      const deltaY = touchStartY - e.touches[0].clientY;
      this.targetDepth += deltaY * 2;
      this.targetDepth = Math.max(0, Math.min(this.maxDepth, this.targetDepth));
      touchStartY = e.touches[0].clientY;
    });

    document.getElementById('sound-toggle').addEventListener('click', () => {
      this.toggleSound();
    });

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;

    if (this.soundEnabled) {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      this.startAmbientSound();
    } else {
      this.stopAmbientSound();
    }
  }

  startAmbientSound() {
    const createOscillator = (freq, gain, type = 'sine') => {
      const osc = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      const filter = this.audioContext.createBiquadFilter();

      osc.type = type;
      osc.frequency.value = freq;

      filter.type = 'lowpass';
      filter.frequency.value = 300;

      gainNode.gain.value = gain;

      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      osc.start();

      return { osc, gainNode, filter };
    };

    this.oscillators = [
      createOscillator(35, 0.04),
      createOscillator(55, 0.025),
      createOscillator(110, 0.015),
      createOscillator(180, 0.008, 'triangle')
    ];

    this.bubbleInterval = setInterval(() => {
      if (this.soundEnabled) {
        this.playBubbleSound();
      }
    }, 300 + Math.random() * 1500);
  }

  stopAmbientSound() {
    this.oscillators.forEach(({ osc, gainNode }) => {
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.5);
      setTimeout(() => osc.stop(), 500);
    });
    this.oscillators = [];
    clearInterval(this.bubbleInterval);
  }

  playBubbleSound() {
    if (!this.audioContext || !this.soundEnabled) return;

    const osc = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600 + Math.random() * 500, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1000 + Math.random() * 600, this.audioContext.currentTime + 0.15);

    gainNode.gain.setValueAtTime(0.015, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.25);

    osc.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.25);
  }

  hideLoading() {
    const loading = document.getElementById('loading');
    loading.classList.add('hidden');

    setTimeout(() => {
      const title = document.getElementById('title-overlay');
      title.style.opacity = '0';
      setTimeout(() => title.style.display = 'none', 2000);
    }, 3000);
  }

  updateDepth() {
    this.depth += (this.targetDepth - this.depth) * 0.03;

    const depthMarker = document.getElementById('depth-marker');
    const depthLabel = document.getElementById('depth-label');
    const zoneIndicator = document.getElementById('zone-indicator');

    const markerPosition = (this.depth / this.maxDepth) * 188;
    depthMarker.style.top = `${markerPosition}px`;
    depthLabel.textContent = `${Math.floor(this.depth)}m`;

    const currentZone = this.zones.find(z => this.depth >= z.min && this.depth < z.max) || this.zones[this.zones.length - 1];
    zoneIndicator.textContent = currentZone.name;

    // Update fog and lighting
    const depthRatio = this.depth / this.maxDepth;
    this.scene.fog.density = 0.003 + depthRatio * 0.025;
    this.scene.fog.color.copy(currentZone.color);

    this.renderer.setClearColor(currentZone.color, 1);

    this.ambientLight.intensity = currentZone.lightIntensity * 0.4;
    this.sunLight.intensity = currentZone.lightIntensity * 0.8;
    this.hemiLight.intensity = currentZone.lightIntensity * 0.3;

    // Update sound
    if (this.soundEnabled && this.oscillators.length > 0) {
      const pitchMod = 1 - depthRatio * 0.4;
      this.oscillators.forEach(({ osc }, i) => {
        const baseFreqs = [35, 55, 110, 180];
        osc.frequency.setValueAtTime(baseFreqs[i] * pitchMod, this.audioContext.currentTime);
      });
    }
  }

  updateFishSchools(time) {
    this.fishSchools.forEach(school => {
      // Update school center with wandering behavior
      school.center.add(school.velocity);

      // Bounce off boundaries
      if (Math.abs(school.center.x) > 180) school.velocity.x *= -1;
      if (Math.abs(school.center.z) > 180) school.velocity.z *= -1;

      // Gradual direction changes
      if (Math.random() < 0.005) {
        school.velocity.x += (Math.random() - 0.5) * 0.1;
        school.velocity.z += (Math.random() - 0.5) * 0.1;
      }

      // Normalize velocity
      school.velocity.normalize().multiplyScalar(0.15);

      // Update each fish
      school.fish.forEach((fish, idx) => {
        const data = fish.userData;

        // Boids-like behavior
        const separation = new THREE.Vector3();
        const alignment = new THREE.Vector3();
        const cohesion = new THREE.Vector3();

        let neighborCount = 0;

        school.fish.forEach((other, otherIdx) => {
          if (idx === otherIdx) return;
          const dist = fish.position.distanceTo(other.position);
          if (dist < 10) {
            neighborCount++;

            // Separation
            separation.subVectors(fish.position, other.position).divideScalar(dist);

            // Alignment
            alignment.add(other.userData.velocity);

            // Cohesion
            cohesion.add(other.position);
          }
        });

        if (neighborCount > 0) {
          alignment.divideScalar(neighborCount);
          cohesion.divideScalar(neighborCount).sub(fish.position);

          data.velocity.add(separation.multiplyScalar(0.05));
          data.velocity.add(alignment.multiplyScalar(0.02));
          data.velocity.add(cohesion.multiplyScalar(0.01));
        }

        // Follow school center
        const toCenter = new THREE.Vector3().subVectors(school.center, fish.position);
        data.velocity.add(toCenter.multiplyScalar(0.001));

        // Apply velocity
        fish.position.add(data.velocity);

        // Swimming motion
        fish.position.y += Math.sin(time * 2 + data.phase) * 0.01;

        // Face direction
        fish.lookAt(fish.position.clone().add(data.velocity));

        // Tail animation
        if (data.tail) {
          data.tail.rotation.y = Math.sin(time * data.tailSpeed + data.tailPhase) * 0.3;
        }
      });
    });
  }

  updateTurtles(time) {
    this.creatures.filter(c => c.type === 'turtle').forEach(({ mesh }) => {
      const data = mesh.userData;

      mesh.position.add(data.velocity);

      // Boundary check
      if (Math.abs(mesh.position.x) > 200) {
        data.velocity.x *= -1;
        mesh.rotation.y += Math.PI;
      }

      // Swimming depth variation
      mesh.position.y = data.swimDepth + Math.sin(time * 0.3 + data.flapPhase) * 5;

      // Flipper animation
      const flapAngle = Math.sin(time * 1.5 + data.flapPhase) * 0.3;
      if (data.frontLeftFlipper) {
        data.frontLeftFlipper.rotation.z = -0.3 + flapAngle;
        data.frontRightFlipper.rotation.z = 0.3 - flapAngle;
      }

      // Head bob
      mesh.children[1].rotation.x = Math.sin(time * 0.5) * 0.1;
    });
  }

  updateSharks(time) {
    this.sharks.forEach(shark => {
      const data = shark.userData;

      shark.position.add(data.velocity);

      // Boundary check
      if (Math.abs(shark.position.x) > data.patrolRange) {
        data.velocity.x *= -1;
        shark.rotation.y += Math.PI;
      }

      // Subtle vertical movement
      shark.position.y += Math.sin(time * 0.5) * 0.01;

      // Tail animation
      if (data.tailFin) {
        data.tailFin.rotation.y = Math.sin(time * 2 + data.tailPhase) * 0.15;
      }
    });
  }

  updateWhales(time) {
    this.whales.forEach(whale => {
      const data = whale.userData;

      whale.position.add(data.velocity);

      // Boundary
      if (whale.position.x > 200) whale.position.x = -200;

      // Whale swimming motion
      whale.position.y += Math.sin(time * 0.2 + data.swimCycle) * 0.03;

      // Tail animation
      const tailWave = Math.sin(time * 0.5 + data.tailPhase) * 0.1;
      whale.rotation.z = tailWave * 0.1;

      data.swimCycle += 0.01;
    });
  }

  updateJellyfish(time) {
    this.jellyfish.forEach(jelly => {
      const data = jelly.userData;

      // Pulsing bell
      const pulse = Math.sin(time * 0.8 + data.pulsePhase);
      if (data.bell) {
        data.bell.scale.y = 0.8 + pulse * 0.15;
        data.bell.scale.x = 1 + pulse * 0.1;
        data.bell.scale.z = 1 + pulse * 0.1;
      }

      // Vertical movement
      jelly.position.y = data.originalY + Math.sin(time * 0.3 + data.pulsePhase) * 5;

      // Horizontal drift
      jelly.position.x += Math.sin(time * 0.2 + data.driftAngle) * 0.02;
      jelly.position.z += Math.cos(time * 0.15 + data.driftAngle) * 0.02;

      // Tentacle sway
      if (data.tentacles) {
        data.tentacles.forEach((t, i) => {
          t.mesh.rotation.x = Math.sin(time * 1.5 + i * 0.3) * 0.2;
          t.mesh.rotation.z = Math.cos(time * 1.2 + i * 0.2) * 0.15;
        });
      }

      // Light pulse
      if (data.light) {
        data.light.intensity = 0.3 + pulse * 0.2;
      }
    });
  }

  updateDeepSeaCreatures(time) {
    this.deepSeaCreatures.forEach(creature => {
      const data = creature.userData;

      // Anglerfish specific
      if (data.esca) {
        const pulse = Math.sin(time * 3 + data.pulsePhase);
        data.escaMaterial.emissiveIntensity = 1.5 + pulse * 0.5;
        data.lureLight.intensity = 1.5 + pulse * 0.5;
      }

      // Slow movement
      creature.position.x += Math.sin(time * 0.2 + data.pulsePhase) * 0.01 * data.swimSpeed;
      creature.position.y += Math.sin(time * 0.15) * 0.005 * data.swimSpeed;
    });
  }

  updateBubbles(time) {
    this.bubbles.forEach(bubble => {
      const data = bubble.userData;

      bubble.position.y += data.speed;
      bubble.position.x += Math.sin(time * data.wobbleSpeed + data.wobblePhase) * 0.02;

      // Wobble size
      bubble.scale.x = bubble.scale.z = 1 + Math.sin(time * data.wobbleSpeed * 2) * 0.05;

      // Reset when reaching surface
      if (bubble.position.y > 100) {
        bubble.position.y = -100;
        bubble.position.x = (Math.random() - 0.5) * 300;
        bubble.position.z = (Math.random() - 0.5) * 300;
      }
    });
  }

  updatePlankton(time) {
    this.plankton.forEach(p => {
      const data = p.userData;

      p.position.x = data.originalPos.x + Math.sin(time * data.speed + data.phase) * 2;
      p.position.y = data.originalPos.y + Math.cos(time * data.speed * 0.7 + data.phase) * 1.5;
      p.position.z = data.originalPos.z + Math.sin(time * data.speed * 0.5 + data.phase) * 2;
    });
  }

  updateCaustics(time) {
    if (this.causticPlane) {
      this.causticPlane.material.uniforms.time.value = time * 0.5;
    }

    // Update volumetric light beams
    this.causticLights.forEach(light => {
      light.mesh.material.uniforms.time.value = time * light.speed;
    });
  }

  updateInfoPanel() {
    const infoPanel = document.getElementById('info-panel');
    const creatureName = document.getElementById('creature-name');
    const creatureInfo = document.getElementById('creature-info');

    const relevantCreature = this.creaturesData.find(c =>
      this.depth >= c.depth[0] && this.depth < c.depth[1]
    );

    if (relevantCreature) {
      creatureName.textContent = relevantCreature.name;
      creatureInfo.textContent = relevantCreature.info;
      infoPanel.classList.add('visible');
    } else {
      infoPanel.classList.remove('visible');
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const time = this.clock.getElapsedTime();

    this.updateDepth();
    this.updateFishSchools(time);
    this.updateTurtles(time);
    this.updateSharks(time);
    this.updateWhales(time);
    this.updateJellyfish(time);
    this.updateDeepSeaCreatures(time);
    this.updateBubbles(time);
    this.updatePlankton(time);
    this.updateCaustics(time);
    this.updateInfoPanel();

    // Camera movement
    this.camera.position.x += (this.mouseX * 15 - this.camera.position.x) * 0.02;
    this.camera.position.y += (-this.mouseY * 8 - this.camera.position.y) * 0.02;
    this.camera.position.y -= this.depth * 0.01;

    this.camera.lookAt(0, -this.depth * 0.005, 0);

    this.renderer.render(this.scene, this.camera);
  }
}

const odyssey = new MarineOdyssey();
