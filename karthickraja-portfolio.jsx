
import { useEffect, useRef, useState, useCallback } from "react";

// ─── Color palette ───────────────────────────────────────────────────────────
const C = {
  charcoal: "#0d0f14",
  charcoalMid: "#161a24",
  charcoalLight: "#1e2533",
  blue: "#00c8ff",
  blueDim: "#0077aa",
  blueGlow: "rgba(0,200,255,0.18)",
  canvas: "#f5e6c8",
  canvasDim: "#c9a96e",
  canvasGlow: "rgba(245,220,160,0.18)",
  white: "#e8eef7",
  grey: "#8899aa",
};

// ─── Three.js scene ──────────────────────────────────────────────────────────
function useThreeScene(canvasRef) {
  const sceneRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const THREE = window.THREE;
    if (!THREE) return;

    const W = window.innerWidth, H = window.innerHeight;
    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0d0f14, 0.018);

    const camera = new THREE.PerspectiveCamera(65, W / H, 0.1, 300);
    camera.position.set(0, 2, 14);

    // ── Lighting ──
    const ambient = new THREE.AmbientLight(0x112233, 1.2);
    scene.add(ambient);

    const techLight = new THREE.PointLight(0x00c8ff, 80, 40);
    techLight.position.set(-14, 6, 0);
    scene.add(techLight);

    const artLight = new THREE.PointLight(0xf5c87a, 80, 40);
    artLight.position.set(14, 6, 0);
    scene.add(artLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.5);
    keyLight.position.set(0, 20, 10);
    scene.add(keyLight);

    // ── Star field ──
    const starGeo = new THREE.BufferGeometry();
    const starCount = 1800;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i++) starPos[i] = (Math.random() - 0.5) * 280;
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xaaccff, size: 0.22, sizeAttenuation: true });
    scene.add(new THREE.Points(starGeo, starMat));

    // ── Floor grid ──
    const gridHelper = new THREE.GridHelper(120, 60, 0x00c8ff, 0x112233);
    gridHelper.position.y = -3;
    scene.add(gridHelper);

    // ── Tech side: floating nodes & edges ──
    const techGroup = new THREE.Group();
    techGroup.position.set(-16, 0, 0);
    scene.add(techGroup);

    const nodePositions = [
      [0,4,0],[3,1,2],[-3,1,-2],[2,-1,3],[-2,3,-3],[4,3,-1],[-4,-1,2],[1,5,-2],[-1,-3,1],[3,-2,-3]
    ];
    const nodeMeshes = [];
    const nodeMat = new THREE.MeshStandardMaterial({ color: 0x00c8ff, emissive: 0x003344, metalness: 0.6, roughness: 0.3 });
    nodePositions.forEach(([x,y,z]) => {
      const geo = new THREE.IcosahedronGeometry(0.32, 1);
      const mesh = new THREE.Mesh(geo, nodeMat.clone());
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      techGroup.add(mesh);
      nodeMeshes.push(mesh);
    });

    // Edges between nodes
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x00c8ff, transparent: true, opacity: 0.35 });
    for (let i = 0; i < nodePositions.length; i++) {
      for (let j = i + 1; j < nodePositions.length; j++) {
        if (Math.random() > 0.55) continue;
        const pts = [
          new THREE.Vector3(...nodePositions[i]),
          new THREE.Vector3(...nodePositions[j])
        ];
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        techGroup.add(new THREE.Line(geo, edgeMat));
      }
    }

    // Floating code blocks (thin boxes)
    const codeLabels = ["ABAP","Python","Java","HTML","CSS"];
    codeLabels.forEach((_, i) => {
      const geo = new THREE.BoxGeometry(1.8, 0.45, 0.08);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x001a2e, emissive: 0x00c8ff, emissiveIntensity: 0.3,
        metalness: 0.8, roughness: 0.2, transparent: true, opacity: 0.85
      });
      const m = new THREE.Mesh(geo, mat);
      m.position.set(-2 + i * 1.1, -1.5 + i * 0.6, 1.5 - i * 0.4);
      m.rotation.z = 0.05 * (i % 2 === 0 ? 1 : -1);
      techGroup.add(m);
    });

    // Server rack silhouette
    const rackGeo = new THREE.BoxGeometry(1.4, 4, 0.8);
    const rackMat = new THREE.MeshStandardMaterial({ color: 0x111827, emissive: 0x001833, metalness: 0.9, roughness: 0.3 });
    const rack = new THREE.Mesh(rackGeo, rackMat);
    rack.position.set(-6, -1, -2);
    techGroup.add(rack);
    for (let i = 0; i < 6; i++) {
      const slotGeo = new THREE.BoxGeometry(1.1, 0.18, 0.05);
      const slotMat = new THREE.MeshStandardMaterial({ color: 0x00c8ff, emissive: 0x00c8ff, emissiveIntensity: 0.6 + (i%3)*0.15 });
      const slot = new THREE.Mesh(slotGeo, slotMat);
      slot.position.set(-6, -2.5 + i * 0.62, -1.58);
      techGroup.add(slot);
    }

    // ── Art side: gallery frames ──
    const artGroup = new THREE.Group();
    artGroup.position.set(16, 0, 0);
    scene.add(artGroup);

    const framePosRot = [
      [0,3,0, 0,0],[-3.5,1.5,-1, 0,0.2],[3.5,1.5,-1, 0,-0.2],
      [-2,-1,1, 0,0.1],[2,-1,1, 0,-0.1],[0,-2.5,0, 0,0],
    ];
    const canvasColors = [0xf5e6c8,0xf0d8a8,0xfaf0e0,0xfde9c5,0xecd9b0,0xf7e8cf];

    framePosRot.forEach(([x,y,z,rx,ry], idx) => {
      // Frame border
      const frameGeo = new THREE.BoxGeometry(2.4, 2.0, 0.1);
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x7a5c30, metalness: 0.3, roughness: 0.7 });
      const frame = new THREE.Mesh(frameGeo, frameMat);
      frame.position.set(x, y, z);
      frame.rotation.set(rx, ry, 0);
      artGroup.add(frame);

      // Canvas inside
      const cGeo = new THREE.BoxGeometry(2.0, 1.6, 0.05);
      const cMat = new THREE.MeshStandardMaterial({
        color: canvasColors[idx], emissive: canvasColors[idx],
        emissiveIntensity: 0.08, roughness: 0.9
      });
      const cMesh = new THREE.Mesh(cGeo, cMat);
      cMesh.position.set(x, y, z + 0.04);
      cMesh.rotation.set(rx, ry, 0);
      artGroup.add(cMesh);
    });

    // Floating pencil
    const pencilGroup = new THREE.Group();
    const pencilBody = new THREE.CylinderGeometry(0.08, 0.08, 2.5, 8);
    const pencilMat = new THREE.MeshStandardMaterial({ color: 0xf5c842, roughness: 0.5 });
    pencilGroup.add(new THREE.Mesh(pencilBody, pencilMat));
    const tipGeo = new THREE.ConeGeometry(0.08, 0.4, 8);
    const tipMat = new THREE.MeshStandardMaterial({ color: 0xffe0b0 });
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.position.y = -1.45;
    pencilGroup.add(tip);
    pencilGroup.position.set(5, 4, 2);
    pencilGroup.rotation.z = -0.5;
    artGroup.add(pencilGroup);

    // ── Center: floating title platform ──
    const platformGeo = new THREE.CylinderGeometry(3, 3.5, 0.3, 32);
    const platformMat = new THREE.MeshStandardMaterial({
      color: 0x161a24, metalness: 0.8, roughness: 0.3,
      transparent: true, opacity: 0.9
    });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.set(0, -2.5, 6);
    scene.add(platform);

    // Platform ring glow
    const ringGeo = new THREE.TorusGeometry(3.2, 0.06, 8, 64);
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x00c8ff, emissive: 0x00c8ff, emissiveIntensity: 1.0 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, -2.36, 6);
    scene.add(ring);

    // ── Digital rain particles (tech side bg) ──
    const rainCount = 500;
    const rainGeo = new THREE.BufferGeometry();
    const rainPos = new Float32Array(rainCount * 3);
    const rainVel = new Float32Array(rainCount);
    for (let i = 0; i < rainCount; i++) {
      rainPos[i*3] = (Math.random() - 0.5) * 24 - 16;
      rainPos[i*3+1] = (Math.random() - 0.5) * 20;
      rainPos[i*3+2] = (Math.random() - 0.5) * 16;
      rainVel[i] = 0.02 + Math.random() * 0.04;
    }
    rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPos, 3));
    const rainMat = new THREE.PointsMaterial({ color: 0x00c8ff, size: 0.12, transparent: true, opacity: 0.6 });
    const rain = new THREE.Points(rainGeo, rainMat);
    scene.add(rain);

    // ── Orbit dust (art side) ──
    const dustCount = 300;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPos[i*3] = (Math.random() - 0.5) * 20 + 16;
      dustPos[i*3+1] = (Math.random() - 0.5) * 16;
      dustPos[i*3+2] = (Math.random() - 0.5) * 14;
    }
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({ color: 0xf5c87a, size: 0.1, transparent: true, opacity: 0.5 });
    scene.add(new THREE.Points(dustGeo, dustMat));

    // ── Camera target positions per section ──
    const sectionCams = [
      { pos: [0, 2, 14], look: [0, 0, 0] },       // Home
      { pos: [-14, 2, 8], look: [-16, 0, 0] },      // Experience
      { pos: [-18, 0, 4], look: [-16, 0, 0] },      // Skills
      { pos: [14, 2, 8], look: [16, 0, 0] },        // Art Gallery
      { pos: [0, 1, 10], look: [0, -2.5, 6] },      // Contact
    ];

    sceneRef.current = {
      renderer, scene, camera, nodeMeshes, techGroup, artGroup,
      pencilGroup, platform, ring, rain, rainPos, rainVel,
      sectionCams, techLight, artLight
    };

    let t = 0;
    let currentSec = 0;
    let targetPos = new THREE.Vector3(0, 2, 14);
    let targetLook = new THREE.Vector3(0, 0, 0);
    const camPos = new THREE.Vector3(0, 2, 14);
    const lookAt = new THREE.Vector3(0, 0, 0);

    const handleResize = () => {
      const w = window.innerWidth, h = window.innerHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", handleResize);

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      t += 0.008;

      // ── Animate nodes ──
      nodeMeshes.forEach((n, i) => {
        n.rotation.x += 0.008;
        n.rotation.y += 0.012;
        n.position.y += Math.sin(t * 1.1 + i) * 0.004;
      });

      // ── Animate pencil ──
      pencilGroup.rotation.z = -0.5 + Math.sin(t * 0.7) * 0.12;
      pencilGroup.position.y = 4 + Math.sin(t * 0.9) * 0.3;

      // ── Platform pulse ──
      ring.material.emissiveIntensity = 0.7 + Math.sin(t * 2) * 0.3;

      // ── Tech group gentle bob ──
      techGroup.position.y = Math.sin(t * 0.4) * 0.3;
      techGroup.rotation.y = Math.sin(t * 0.2) * 0.08;

      // ── Art group gentle bob ──
      artGroup.position.y = Math.cos(t * 0.4) * 0.25;

      // ── Digital rain ──
      const rainArr = rain.geometry.attributes.position.array;
      for (let i = 0; i < rainCount; i++) {
        rainArr[i*3+1] -= rainVel[i];
        if (rainArr[i*3+1] < -10) rainArr[i*3+1] = 10;
      }
      rain.geometry.attributes.position.needsUpdate = true;

      // ── Camera lerp ──
      const sec = sceneRef.current._targetSection ?? 0;
      if (sec !== currentSec) {
        const c = sectionCams[sec];
        targetPos.set(...c.pos);
        targetLook.set(...c.look);
        currentSec = sec;
      }
      camPos.lerp(targetPos, 0.025);
      lookAt.lerp(targetLook, 0.025);
      camera.position.copy(camPos);
      camera.lookAt(lookAt);

      // Light pulse
      techLight.intensity = 80 + Math.sin(t * 1.5) * 15;
      artLight.intensity = 80 + Math.cos(t * 1.3) * 12;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
    };
  }, [canvasRef]);

  const setSection = useCallback((idx) => {
    if (sceneRef.current) sceneRef.current._targetSection = idx;
  }, []);

  return { setSection };
}

// ─── Section data ─────────────────────────────────────────────────────────────
const SECTIONS = ["Home", "Experience", "Skills", "Art Gallery", "Contact"];

const SKILLS = [
  { name: "SAP ABAP", level: 92, color: C.blue },
  { name: "Python", level: 75, color: C.blue },
  { name: "Core Java", level: 68, color: C.blue },
  { name: "Troubleshooting", level: 88, color: C.blue },
  { name: "HTML & CSS", level: 72, color: C.canvasDim },
  { name: "Sketch Art", level: 95, color: C.canvasDim },
];

const EXPERIENCE = [
  {
    role: "SAP ABAP Consultant",
    company: "Kaavian Systems",
    duration: "3.5 Years",
    side: "tech",
    bullets: [
      "Custom ABAP report & module pool development",
      "BDC, BAPI, RFC & ALE/IDOC integrations",
      "Performance tuning & SAP workflow design",
      "Client requirement analysis & unit testing",
    ],
  },
  {
    role: "System Engineer",
    company: "BG Systems",
    duration: "6 Months",
    side: "tech",
    bullets: [
      "Hardware & software troubleshooting",
      "Network configuration & system support",
      "End-user IT assistance & documentation",
    ],
  },
];

const EDUCATION = [
  { degree: "MCA", score: "74% CGPA", icon: "🎓" },
  { degree: "BCA", score: "60% CGPA", icon: "📘" },
];

// ─── Components ──────────────────────────────────────────────────────────────
function NavBar({ active, onNav }) {
  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "0 2.5rem", height: "62px",
      background: "rgba(13,15,20,0.72)",
      backdropFilter: "blur(16px)",
      borderBottom: `1px solid rgba(0,200,255,0.12)`,
    }}>
      <div style={{ fontFamily: "'Space Mono', monospace", color: C.blue, fontSize: "1rem", letterSpacing: "0.12em" }}>
        <span style={{ color: C.canvasDim }}>M.</span>Karthickraja
      </div>
      <div style={{ display: "flex", gap: "0.2rem" }}>
        {SECTIONS.map((s, i) => (
          <button key={s} onClick={() => onNav(i)} style={{
            background: active === i ? "rgba(0,200,255,0.1)" : "transparent",
            color: active === i ? C.blue : C.grey,
            border: active === i ? `1px solid rgba(0,200,255,0.35)` : "1px solid transparent",
            borderRadius: "6px", padding: "0.35rem 0.9rem",
            fontFamily: "'Space Mono', monospace", fontSize: "0.72rem",
            cursor: "pointer", letterSpacing: "0.08em",
            transition: "all 0.25s",
          }}>
            {s.toUpperCase()}
          </button>
        ))}
      </div>
    </nav>
  );
}

function SectionTag({ label, side }) {
  const isTech = side === "tech";
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: "0.5rem",
      background: isTech ? "rgba(0,200,255,0.1)" : "rgba(245,220,160,0.1)",
      border: `1px solid ${isTech ? "rgba(0,200,255,0.3)" : "rgba(245,200,120,0.35)"}`,
      borderRadius: "4px", padding: "0.2rem 0.7rem",
      fontFamily: "'Space Mono', monospace", fontSize: "0.65rem",
      color: isTech ? C.blue : C.canvasDim, letterSpacing: "0.12em",
      marginBottom: "0.75rem",
    }}>
      <span>{isTech ? "◈ TECH" : "✦ ART"}</span>
    </div>
  );
}

function SkillBar({ name, level, color }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        marginBottom: "0.9rem",
        transform: hovered ? "translateX(6px)" : "none",
        transition: "transform 0.25s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.78rem", color: hovered ? C.white : C.grey, transition: "color 0.2s" }}>{name}</span>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.72rem", color }}>{level}%</span>
      </div>
      <div style={{ height: "5px", background: "rgba(255,255,255,0.07)", borderRadius: "3px", overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${level}%`,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          borderRadius: "3px",
          boxShadow: hovered ? `0 0 8px ${color}` : "none",
          transition: "box-shadow 0.3s",
        }} />
      </div>
    </div>
  );
}

function Terminal({ children }) {
  return (
    <div style={{
      background: "rgba(0,10,20,0.9)", border: `1px solid rgba(0,200,255,0.2)`,
      borderRadius: "10px", overflow: "hidden",
      boxShadow: "0 0 40px rgba(0,200,255,0.08)",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "0.4rem",
        padding: "0.55rem 1rem",
        background: "rgba(0,200,255,0.06)", borderBottom: `1px solid rgba(0,200,255,0.15)`,
      }}>
        {["#ff5f57","#ffbd2e","#28c940"].map(c => (
          <div key={c} style={{ width: "10px", height: "10px", borderRadius: "50%", background: c }} />
        ))}
        <span style={{ marginLeft: "0.5rem", fontFamily: "'Space Mono', monospace", fontSize: "0.65rem", color: C.grey }}>skills.abap</span>
      </div>
      <div style={{ padding: "1.2rem 1.4rem" }}>{children}</div>
    </div>
  );
}

function ArtFrame({ index, label }) {
  const [hovered, setHovered] = useState(false);
  const colors = ["#f5e6c8","#fde9c5","#f0d8a8","#faf0e0","#ecd9b0","#f7e8cf"];
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: colors[index % colors.length],
        border: `3px solid ${hovered ? C.canvasDim : "#b8954a"}`,
        borderRadius: "4px",
        aspectRatio: "4/3",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        cursor: "pointer",
        transform: hovered ? "scale(1.04) rotate(0.5deg)" : "scale(1)",
        transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
        boxShadow: hovered ? "0 12px 40px rgba(0,0,0,0.5), 0 0 20px rgba(245,200,120,0.2)" : "0 4px 18px rgba(0,0,0,0.35)",
        position: "relative", overflow: "hidden",
        padding: "1rem",
      }}
    >
      <div style={{
        position: "absolute", inset: "6px",
        border: "1px solid rgba(150,110,60,0.3)", borderRadius: "2px",
        pointerEvents: "none",
      }}/>
      <div style={{ fontSize: "2.2rem", marginBottom: "0.4rem" }}>✏️</div>
      <div style={{
        fontFamily: "'Playfair Display', serif", fontSize: "0.8rem",
        color: "#5a3e1b", textAlign: "center", fontStyle: "italic",
      }}>{label}</div>
      {hovered && (
        <div style={{
          position: "absolute", bottom: "8px", right: "10px",
          fontFamily: "'Space Mono', monospace", fontSize: "0.55rem",
          color: C.canvasDim, opacity: 0.7,
        }}>[ sketch ]</div>
      )}
    </div>
  );
}

function GlowCard({ children, side = "tech", style = {} }) {
  return (
    <div style={{
      background: side === "tech" ? "rgba(0,10,30,0.75)" : "rgba(40,25,10,0.75)",
      border: `1px solid ${side === "tech" ? "rgba(0,200,255,0.18)" : "rgba(245,200,120,0.18)"}`,
      borderRadius: "12px", padding: "1.8rem",
      backdropFilter: "blur(10px)",
      boxShadow: side === "tech" ? "0 0 40px rgba(0,200,255,0.06)" : "0 0 40px rgba(245,190,100,0.08)",
      ...style,
    }}>
      {children}
    </div>
  );
}

// ─── Section overlays ─────────────────────────────────────────────────────────
function HomeOverlay() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center" }}>
      <div style={{ marginBottom: "0.6rem" }}>
        <SectionTag label="HYBRID WORKSPACE" side="tech" />
      </div>
      <h1 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: "clamp(2.8rem,6vw,5.5rem)",
        fontWeight: 700,
        color: C.white,
        lineHeight: 1.05,
        marginBottom: "0.3rem",
        textShadow: `0 0 60px rgba(0,200,255,0.25)`,
      }}>
        M. Karthick<span style={{ color: C.blue }}>raja</span>
      </h1>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: "clamp(0.75rem,1.5vw,0.95rem)",
        color: C.canvasDim, letterSpacing: "0.22em", marginBottom: "2rem",
        textTransform: "uppercase",
      }}>
        System Engineer &nbsp;·&nbsp; SAP ABAP Consultant &nbsp;·&nbsp; Sketch Artist
      </div>
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
        {["4 YRS EXP", "SAP ABAP", "SKETCH ART"].map((tag, i) => (
          <div key={i} style={{
            fontFamily: "'Space Mono', monospace", fontSize: "0.68rem",
            color: i === 2 ? C.canvasDim : C.blue,
            border: `1px solid ${i === 2 ? "rgba(245,200,120,0.3)" : "rgba(0,200,255,0.3)"}`,
            borderRadius: "4px", padding: "0.3rem 0.8rem", letterSpacing: "0.1em",
          }}>
            {tag}
          </div>
        ))}
      </div>
      <div style={{ marginTop: "3rem", animation: "bounce 2s infinite" }}>
        <div style={{ color: C.grey, fontSize: "0.65rem", fontFamily: "'Space Mono', monospace", letterSpacing: "0.15em", marginBottom: "0.4rem" }}>NAVIGATE ABOVE</div>
        <div style={{ color: C.blue, fontSize: "1.2rem" }}>⌄</div>
      </div>
    </div>
  );
}

function ExperienceOverlay() {
  return (
    <div style={{ maxWidth: "780px", margin: "0 auto", padding: "2rem 1rem" }}>
      <SectionTag label="EXPERIENCE" side="tech" />
      <h2 style={{ fontFamily: "'Playfair Display', serif", color: C.white, fontSize: "clamp(1.8rem,3.5vw,2.6rem)", marginBottom: "2rem", fontWeight: 700 }}>
        Professional Journey
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {EXPERIENCE.map((exp, i) => (
          <GlowCard key={i} side="tech">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
              <div>
                <div style={{ fontFamily: "'Playfair Display', serif", color: C.white, fontSize: "1.25rem", fontWeight: 600 }}>{exp.role}</div>
                <div style={{ fontFamily: "'Space Mono', monospace", color: C.blue, fontSize: "0.78rem", marginTop: "0.25rem" }}>{exp.company}</div>
              </div>
              <div style={{
                background: "rgba(0,200,255,0.1)", border: "1px solid rgba(0,200,255,0.25)",
                borderRadius: "6px", padding: "0.3rem 0.8rem",
                fontFamily: "'Space Mono', monospace", fontSize: "0.7rem", color: C.blue,
              }}>{exp.duration}</div>
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {exp.bullets.map((b, j) => (
                <li key={j} style={{
                  fontFamily: "'Space Mono', monospace", fontSize: "0.75rem",
                  color: C.grey, padding: "0.3rem 0", paddingLeft: "1.2rem", position: "relative",
                }}>
                  <span style={{ position: "absolute", left: 0, color: C.blue }}>›</span>{b}
                </li>
              ))}
            </ul>
          </GlowCard>
        ))}
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          {EDUCATION.map((e, i) => (
            <GlowCard key={i} side="tech" style={{ flex: 1, minWidth: "140px" }}>
              <div style={{ fontSize: "1.6rem", marginBottom: "0.4rem" }}>{e.icon}</div>
              <div style={{ fontFamily: "'Playfair Display', serif", color: C.white, fontWeight: 600 }}>{e.degree}</div>
              <div style={{ fontFamily: "'Space Mono', monospace", color: C.blue, fontSize: "0.75rem" }}>{e.score}</div>
            </GlowCard>
          ))}
        </div>
      </div>
    </div>
  );
}

function SkillsOverlay() {
  return (
    <div style={{ maxWidth: "700px", margin: "0 auto", padding: "2rem 1rem" }}>
      <SectionTag label="SKILLS" side="tech" />
      <h2 style={{ fontFamily: "'Playfair Display', serif", color: C.white, fontSize: "clamp(1.8rem,3.5vw,2.6rem)", marginBottom: "1.5rem", fontWeight: 700 }}>
        Tech &amp; Creative Stack
      </h2>
      <Terminal>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.7rem", color: C.blue, marginBottom: "1.2rem" }}>
          <span style={{ color: C.grey }}>$</span> ./run-skills --mode full
        </div>
        {SKILLS.map((s, i) => <SkillBar key={i} {...s} />)}
        <div style={{
          marginTop: "1.2rem", fontFamily: "'Space Mono', monospace",
          fontSize: "0.65rem", color: "rgba(0,200,255,0.5)",
          borderTop: "1px solid rgba(0,200,255,0.1)", paddingTop: "0.8rem",
        }}>
          ✓ All systems nominal — hover to highlight
        </div>
      </Terminal>
    </div>
  );
}

const SKETCHES = [
  "Portrait Study","Landscape #1","Urban Sketch","Figure Drawing","Still Life","Abstract Study"
];

function GalleryOverlay() {
  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem 1rem" }}>
      <SectionTag label="ART GALLERY" side="art" />
      <h2 style={{ fontFamily: "'Playfair Display', serif", color: C.white, fontSize: "clamp(1.8rem,3.5vw,2.6rem)", marginBottom: "0.5rem", fontWeight: 700 }}>
        Sketch Portfolio
      </h2>
      <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.72rem", color: C.grey, marginBottom: "1.8rem" }}>
        Professional sketch artist — hover frames to explore
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
        {SKETCHES.map((label, i) => <ArtFrame key={i} index={i} label={label} />)}
      </div>
      <div style={{
        marginTop: "1.5rem", fontFamily: "'Playfair Display', serif",
        fontStyle: "italic", color: C.canvasDim, fontSize: "0.85rem", textAlign: "center",
      }}>
        "Art is the bridge between system and soul."
      </div>
    </div>
  );
}

function ContactOverlay() {
  const [copied, setCopied] = useState(null);
  const copy = (txt, key) => {
    navigator.clipboard?.writeText(txt);
    setCopied(key);
    setTimeout(() => setCopied(null), 1800);
  };
  return (
    <div style={{ maxWidth: "560px", margin: "0 auto", padding: "2rem 1rem" }}>
      <SectionTag label="CONTACT" side="tech" />
      <h2 style={{ fontFamily: "'Playfair Display', serif", color: C.white, fontSize: "clamp(1.8rem,3.5vw,2.6rem)", marginBottom: "1.8rem", fontWeight: 700 }}>
        Let's Connect
      </h2>
      <GlowCard side="tech">
        {[
          { icon: "📞", label: "Phone", val: "7708639860", key: "phone" },
          { icon: "✉️", label: "Email", val: "mpkarthickraja19@gmail.com", key: "email" },
        ].map(({ icon, label, val, key }) => (
          <div key={key} onClick={() => copy(val, key)} style={{
            display: "flex", alignItems: "center", gap: "1rem",
            padding: "1.1rem", marginBottom: "0.8rem",
            background: "rgba(0,200,255,0.05)", border: "1px solid rgba(0,200,255,0.12)",
            borderRadius: "8px", cursor: "pointer",
            transition: "all 0.2s",
          }}>
            <span style={{ fontSize: "1.4rem" }}>{icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.62rem", color: C.grey, letterSpacing: "0.1em" }}>{label}</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.82rem", color: C.white, marginTop: "0.15rem" }}>{val}</div>
            </div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", color: copied === key ? "#28c940" : C.blue }}>
              {copied === key ? "✓ COPIED" : "COPY"}
            </div>
          </div>
        ))}
        <div style={{
          marginTop: "1rem", padding: "1rem",
          background: "rgba(245,200,120,0.04)", border: "1px solid rgba(245,200,120,0.12)",
          borderRadius: "8px",
        }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.68rem", color: C.canvasDim, letterSpacing: "0.1em", marginBottom: "0.4rem" }}>OPEN TO</div>
          {["SAP ABAP projects","Freelance sketching","System engineering roles"].map((t, i) => (
            <div key={i} style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.73rem", color: C.grey, padding: "0.2rem 0", paddingLeft: "1rem", position: "relative" }}>
              <span style={{ position: "absolute", left: 0, color: C.canvasDim }}>›</span>{t}
            </div>
          ))}
        </div>
      </GlowCard>
    </div>
  );
}

const OVERLAYS = [HomeOverlay, ExperienceOverlay, SkillsOverlay, GalleryOverlay, ContactOverlay];

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const canvasRef = useRef(null);
  const [active, setActive] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const { setSection } = useThreeScene(canvasRef);

  useEffect(() => {
    // Load Three.js from CDN
    if (window.THREE) { setLoaded(true); return; }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);

    // Load fonts
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Playfair+Display:wght@400;700;900&display=swap";
    document.head.appendChild(link);
  }, []);

  const handleNav = (idx) => {
    setActive(idx);
    setSection(idx);
  };

  const ActiveOverlay = OVERLAYS[active];

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", background: C.charcoal, position: "relative" }}>
      {/* Three.js Canvas */}
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />

      {/* Gradient vignette */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse at center, transparent 40%, rgba(13,15,20,0.7) 100%)",
      }} />

      {/* Side accent lines */}
      <div style={{
        position: "absolute", left: 0, top: "20%", bottom: "20%", width: "2px",
        background: "linear-gradient(to bottom, transparent, rgba(0,200,255,0.4), transparent)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", right: 0, top: "20%", bottom: "20%", width: "2px",
        background: "linear-gradient(to bottom, transparent, rgba(245,200,120,0.4), transparent)",
        pointerEvents: "none",
      }} />

      {/* Side labels */}
      <div style={{
        position: "fixed", left: "1.2rem", top: "50%", transform: "translateY(-50%) rotate(-90deg)",
        fontFamily: "'Space Mono', monospace", fontSize: "0.58rem", color: "rgba(0,200,255,0.45)",
        letterSpacing: "0.2em", pointerEvents: "none",
      }}>TECHNICAL SYSTEMS</div>
      <div style={{
        position: "fixed", right: "1.2rem", top: "50%", transform: "translateY(-50%) rotate(90deg)",
        fontFamily: "'Space Mono', monospace", fontSize: "0.58rem", color: "rgba(245,200,120,0.45)",
        letterSpacing: "0.2em", pointerEvents: "none",
      }}>CREATIVE ART</div>

      {/* Navbar */}
      <NavBar active={active} onNav={handleNav} />

      {/* Section content overlay */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: active === 0 ? "center" : "flex-start",
        justifyContent: "center",
        paddingTop: active === 0 ? 0 : "80px",
        overflowY: "auto",
        pointerEvents: "none",
      }}>
        <div style={{ width: "100%", maxWidth: "900px", pointerEvents: "auto", padding: "0 1.5rem" }}>
          {loaded && <ActiveOverlay />}
        </div>
      </div>

      {/* Section indicator dots */}
      <div style={{
        position: "fixed", bottom: "1.8rem", left: "50%", transform: "translateX(-50%)",
        display: "flex", gap: "0.5rem", zIndex: 50,
      }}>
        {SECTIONS.map((_, i) => (
          <button key={i} onClick={() => handleNav(i)} style={{
            width: active === i ? "22px" : "7px",
            height: "7px",
            borderRadius: "4px",
            background: active === i ? C.blue : "rgba(255,255,255,0.2)",
            border: "none", cursor: "pointer", padding: 0,
            transition: "all 0.35s cubic-bezier(0.34,1.56,0.64,1)",
          }} />
        ))}
      </div>

      {/* Loading state */}
      {!loaded && (
        <div style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: "1rem",
          background: C.charcoal, zIndex: 200,
        }}>
          <div style={{ fontFamily: "monospace", color: C.blue, fontSize: "0.9rem", letterSpacing: "0.15em" }}>INITIALIZING 3D ENGINE...</div>
          <div style={{ width: "200px", height: "2px", background: "rgba(0,200,255,0.15)", borderRadius: "1px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: "60%", background: C.blue, animation: "load 1.2s ease-in-out infinite alternate", borderRadius: "1px" }} />
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(6px)} }
        @keyframes load { from{transform:translateX(-100%)} to{transform:translateX(200%)} }
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:rgba(0,0,0,0.2)}
        ::-webkit-scrollbar-thumb{background:rgba(0,200,255,0.3);border-radius:2px}
        button:hover{opacity:0.85}
      `}</style>
    </div>
  );
}
