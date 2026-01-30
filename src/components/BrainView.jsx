import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, MeshTransmissionMaterial, Sparkles, Box, Sphere, Cylinder, Capsule, Tube, Torus, TorusKnot, Environment } from '@react-three/drei';
import * as THREE from 'three';

// Procedural Nerve Path Generation
const NervePath = ({ points, thickness = 0.01, color = "#0088ff", opacity = 1 }) => {
    const curve = useMemo(() => {
        return new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    }, [points]);

    return (
        <Tube args={[curve, 64, thickness, 8, false]}>
            <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={2}
                transparent
                opacity={opacity}
                roughness={0.4}
            />
        </Tube>
    );
};

// Organic Body Shell with Nerves
const BioPart = ({ children, position, scale }) => {
    return (
        <group position={position} scale={scale}>
            {children}
        </group>
    )
}

function BioDigitalHuman() {
    const groupRef = useRef();

    // Animation: Subtle "breathing" and "typing" micro-movements
    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        if (groupRef.current) {
            // Breath vertical
            groupRef.current.position.y = -0.25 + Math.sin(t * 0.5) * 0.01;
            // Sway
            groupRef.current.rotation.z = Math.sin(t * 0.2) * 0.01;
        }
    });

    const glassMaterial = {
        backside: true,
        samples: 4,
        thickness: 0.05, // Very thin skin
        chromaticAberration: 0.5,
        anisotropy: 0.3,
        distortion: 0.1,
        iridescence: 1,
        iridescenceIOR: 1,
        color: "#dceeff", // Pale blue skin
        transmission: 0.99,
        transparent: true,
        opacity: 0.4,
        roughness: 0,
        clearcoat: 1
    };

    const nerveColor = "#2266ff";

    return (
        <group ref={groupRef}>
            {/* === HEAD COMPLEX === */}
            <group position={[0, 1.45, 0]}>
                {/* Skull Shell */}
                <Sphere args={[0.24, 64, 64]}>
                    <MeshTransmissionMaterial {...glassMaterial} color="#ffffff" thickness={0.1} />
                </Sphere>

                {/* Brain: Complex Folds using TorusKnot */}
                <group scale={0.15}>
                    <TorusKnot args={[1, 0.3, 100, 16]}>
                        <meshStandardMaterial color={nerveColor} emissive={nerveColor} emissiveIntensity={3} wireframe />
                    </TorusKnot>
                    {/* Inner Glow */}
                    <pointLight distance={0.5} intensity={2} color="#00ffff" />
                </group>

                {/* Eyes (sockets) */}
                <Sphere args={[0.03]} position={[0.08, 0, 0.2]}>
                    <meshBasicMaterial color="#000" opacity={0.5} transparent />
                </Sphere>
                <Sphere args={[0.03]} position={[-0.08, 0, 0.2]}>
                    <meshBasicMaterial color="#000" opacity={0.5} transparent />
                </Sphere>
            </group>

            {/* === NECK === */}
            {/* Spine Nerves */}
            <NervePath points={[[0, 1.25, 0], [0, 1.1, -0.05], [0, 0.9, 0]]} thickness={0.03} />
            {/* Carotid Arteries */}
            <NervePath points={[[0.06, 1.2, 0], [0.08, 0.9, 0.05]]} thickness={0.01} />
            <NervePath points={[[-0.06, 1.2, 0], [-0.08, 0.9, 0.05]]} thickness={0.01} />
            {/* Neck Shell */}
            <Cylinder args={[0.11, 0.14, 0.4, 32]} position={[0, 1.1, 0]}>
                <MeshTransmissionMaterial {...glassMaterial} />
            </Cylinder>


            {/* === TORSO === */}
            <group position={[0, 0.5, 0]}>
                {/* Ribcage Simulation (Torus Rings) */}
                <group position={[0, 0.3, 0]}>
                    <Torus args={[0.2, 0.01, 16, 50]} rotation={[1.6, 0, 0]} scale={[1, 0.8, 1]}> <meshBasicMaterial color={nerveColor} transparent opacity={0.5} /> </Torus>
                    <Torus args={[0.22, 0.01, 16, 50]} position={[0, -0.1, 0]} rotation={[1.6, 0, 0]} scale={[1, 0.8, 1]}> <meshBasicMaterial color={nerveColor} transparent opacity={0.5} /> </Torus>
                    <Torus args={[0.21, 0.01, 16, 50]} position={[0, -0.2, 0]} rotation={[1.6, 0, 0]} scale={[1, 0.8, 1]}> <meshBasicMaterial color={nerveColor} transparent opacity={0.5} /> </Torus>
                </group>

                {/* Main Nervous Trunk */}
                <NervePath points={[[0, 0.6, -0.05], [0, -0.2, -0.05]]} thickness={0.04} color="#0044aa" />

                {/* Branching Nerves (Chest) */}
                <NervePath points={[[0, 0.4, -0.05], [0.15, 0.3, 0.1], [0.1, 0.1, 0.15]]} thickness={0.005} />
                <NervePath points={[[0, 0.4, -0.05], [-0.15, 0.3, 0.1], [-0.1, 0.1, 0.15]]} thickness={0.005} />

                {/* Outer Shell (Chest + Abs) */}
                <Capsule args={[0.24, 0.9]} position={[0, 0, 0]}>
                    <MeshTransmissionMaterial {...glassMaterial} />
                </Capsule>
            </group>

            {/* === ARMS (Typing) === */}
            {/* Right Arm */}
            <group position={[0.32, 0.95, 0]}>
                {/* Shoulder Joint */}
                <Sphere args={[0.13]}><MeshTransmissionMaterial {...glassMaterial} /></Sphere>

                <group rotation={[0.4, 0, -0.2]}>
                    {/* Upper Arm Nerve */}
                    <NervePath points={[[0, 0, 0], [0, -0.5, 0]]} thickness={0.02} />
                    {/* Shell */}
                    <Capsule args={[0.09, 0.5]} position={[0, -0.25, 0]}> <MeshTransmissionMaterial {...glassMaterial} /> </Capsule>

                    {/* Elbow */}
                    <group position={[0, -0.55, 0]} rotation={[-1.7, 0.2, 0]}>
                        {/* Forearm Nerve */}
                        <NervePath points={[[0, 0, 0], [0, 0.4, 0]]} thickness={0.02} />
                        {/* Forearm Shell */}
                        <Capsule args={[0.08, 0.45]} position={[0, 0.2, 0]}> <MeshTransmissionMaterial {...glassMaterial} /> </Capsule>

                        {/* Hand */}
                        <Sphere args={[0.09]} position={[0, 0.5, 0]}> <MeshTransmissionMaterial {...glassMaterial} /> </Sphere>
                    </group>
                </group>
            </group>

            {/* Left Arm */}
            <group position={[-0.32, 0.95, 0]}>
                {/* Shoulder Joint */}
                <Sphere args={[0.13]}><MeshTransmissionMaterial {...glassMaterial} /></Sphere>

                <group rotation={[0.4, 0, 0.2]}>
                    {/* Upper Arm Nerve */}
                    <NervePath points={[[0, 0, 0], [0, -0.5, 0]]} thickness={0.02} />
                    {/* Shell */}
                    <Capsule args={[0.09, 0.5]} position={[0, -0.25, 0]}> <MeshTransmissionMaterial {...glassMaterial} /> </Capsule>

                    {/* Elbow */}
                    <group position={[0, -0.55, 0]} rotation={[-1.7, -0.2, 0]}>
                        {/* Forearm Nerve */}
                        <NervePath points={[[0, 0, 0], [0, 0.4, 0]]} thickness={0.02} />
                        {/* Forearm Shell */}
                        <Capsule args={[0.08, 0.45]} position={[0, 0.2, 0]}> <MeshTransmissionMaterial {...glassMaterial} /> </Capsule>

                        {/* Hand */}
                        <Sphere args={[0.09]} position={[0, 0.5, 0]}> <MeshTransmissionMaterial {...glassMaterial} /> </Sphere>
                    </group>
                </group>
            </group>

            {/* === LAPTOP === */}
            <group position={[0, 0.4, 0.7]}>
                <Box args={[0.9, 0.02, 0.6]}>
                    <meshStandardMaterial color="#333" roughness={0.5} metalness={0.8} />
                </Box>
                {/* Screen */}
                <group position={[0, 0.01, -0.3]} rotation={[-0.25, 0, 0]}>
                    <Box args={[0.9, 0.55, 0.02]} position={[0, 0.27, 0]}>
                        <meshPhysicalMaterial
                            color="#000"
                            transmission={0.5}
                            transparent
                            opacity={0.9}
                            roughness={0.2}
                        />
                    </Box>
                    {/* Hologram Projector */}
                    <Box args={[0.85, 0.5, 0.01]} position={[0, 0.27, 0.02]}>
                        <meshBasicMaterial color="#0088ff" opacity={0.6} transparent />
                    </Box>
                    <Sparkles
                        count={30}
                        scale={[0.8, 0.5, 0.5]}
                        position={[0, 0.3, 0.2]}
                        size={4}
                        speed={1}
                        color="#00ffff"
                    />
                </group>
            </group>

            {/* === AMBIENT PARTICLES === */}
            <Sparkles
                count={200}
                scale={[3, 4, 3]}
                position={[0, 1, 0]}
                size={2}
                speed={0.2}
                opacity={0.3}
                color="#ffffff"
            />
        </group>
    );
}

export default function BrainView() {
    return (
        <div style={{ width: '100%', height: '100%' }}>
            <Canvas
                camera={{ position: [0, 1, 3.2], fov: 35 }}
                gl={{ alpha: true, antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
            >
                <color attach="background" args={['transparent']} />

                {/* Cinematic Lighting */}
                <ambientLight intensity={0.1} />
                <spotLight
                    position={[5, 5, 5]}
                    angle={0.3}
                    penumbra={1}
                    intensity={4}
                    color="#4466ff"
                    castShadow
                />
                <pointLight position={[-2, 2, 2]} intensity={2} color="#00ffff" distance={5} />
                <pointLight position={[2, 0, 2]} intensity={1} color="#ff0088" distance={3} />

                <BioDigitalHuman />

                <Environment preset="night" blur={0.8} />
                <OrbitControls
                    enableZoom={true}
                    enablePan={false}
                    minPolarAngle={Math.PI / 4}
                    maxPolarAngle={Math.PI / 1.8}
                    minDistance={2}
                    maxDistance={5}
                />
            </Canvas>
        </div>
    );
}
