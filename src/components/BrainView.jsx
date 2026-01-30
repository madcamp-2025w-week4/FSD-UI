import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, MeshTransmissionMaterial, Sparkles, useGLTF, Environment } from '@react-three/drei';

// Preload the head model
useGLTF.preload('/models/LeePerrySmith.glb');

function LeeHead() {
    const groupRef = useRef();
    const { nodes } = useGLTF('/models/LeePerrySmith.glb');

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        if (groupRef.current) {
            // Floating animation
            groupRef.current.position.y = Math.sin(t * 0.5) * 0.05;
            // Subtle idle rotation
            groupRef.current.rotation.y = Math.sin(t * 0.2) * 0.1;
        }
    });

    return (
        <group ref={groupRef} position={[0, -0.5, 0]} scale={0.2}>
            {/* Use the high-fidelity scanned head geometry */}
            <mesh geometry={nodes.LeePerrySmith.geometry} rotation={[0, 0, 0]}>
                <meshStandardMaterial
                    color="#e0e0e0" // Bright Grey
                    roughness={0.9}
                    metalness={0.2}
                    emissive="#224488" // Softer blue glow
                    emissiveIntensity={0.2}
                    side={2}
                />
            </mesh>

            {/* Ambient particles for atmosphere */}
            <Sparkles count={80} scale={4} size={3} speed={0.4} opacity={0.5} color="#88ccff" />
        </group>
    );
}

export default function BrainView() {
    return (
        <div style={{ width: '100%', height: '100%' }}>
            <Canvas
                camera={{ position: [0, 0, 4], fov: 35 }}
                gl={{ alpha: true, antialias: true }}
            >
                <ambientLight intensity={0.3} />
                {/* Cinematic Lighting Setup */}
                <spotLight position={[5, 5, 5]} angle={0.5} penumbra={1} intensity={3} color="#ffffff" />
                <spotLight position={[-5, 5, 5]} angle={0.5} penumbra={1} intensity={3} color="#0088ff" />
                <pointLight position={[0, -5, 2]} intensity={2} color="#00ffff" />

                <LeeHead />

                <Environment preset="city" blur={1} />
                <OrbitControls
                    enableZoom={true}
                    enablePan={false}
                    minPolarAngle={Math.PI / 3}
                    maxPolarAngle={Math.PI / 1.5}
                    minDistance={2}
                    maxDistance={6}
                />
            </Canvas>
        </div>
    );
}
