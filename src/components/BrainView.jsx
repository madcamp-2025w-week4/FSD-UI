import React, { useRef, useEffect, useState, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, Html } from '@react-three/drei';
import * as THREE from 'three';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';

const FACE_MODEL_URL = '/models/facecap.glb';
const FACE_SCALE = 0.6;
const HAPPY_SMILE = 1.0;
const BASE_FACE_COLOR = '#8e8e8e';

const BLINK_KEYS = ['eyeBlink_L'];
const BLINK_KEYS_RIGHT = ['eyeBlink_R'];
const SMILE_KEYS = ['mouthSmile_L', 'mouthSmile_R'];

const SMILE_LEFT_KEYS = ['mouthSmile_L'];
const SMILE_RIGHT_KEYS = ['mouthSmile_R'];
const JAW_KEYS = ['jawOpen'];

function findMorphIndex(dict, keys) {
  if (!dict) return null;
  const dictKeys = Object.keys(dict);
  for (const key of keys) {
    if (dict[key] !== undefined) return dict[key];
    const found = dictKeys.find((k) => k.toLowerCase().includes(key.toLowerCase()));
    if (found) return dict[found];
  }
  return null;
}

function FaceCapCharacter({ gear, fsdSleep }) {
  const { gl } = useThree();
  const groupRef = useRef();

  const { scene: originalFaceScene } = useGLTF(FACE_MODEL_URL, undefined, undefined, (loader) => {
    const ktx2Loader = new KTX2Loader();
    ktx2Loader.setTranscoderPath('https://unpkg.com/three@0.160.0/examples/jsm/libs/basis/');
    ktx2Loader.detectSupport(gl);
    loader.setKTX2Loader(ktx2Loader);
    loader.setMeshoptDecoder(MeshoptDecoder);
  });

  const faceScene = useMemo(
    () => (originalFaceScene ? skeletonClone(originalFaceScene) : null),
    [originalFaceScene]
  );

  const [morphTargets, setMorphTargets] = useState([]);

  useEffect(() => {
    if (!faceScene) return;

    const foundMorphs = [];
    faceScene.traverse((child) => {
      if (!child.isMesh) return;

      // Override materials to a clean, bright surface.
      const baseMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(BASE_FACE_COLOR),
        roughness: 0.5,
        metalness: 0.0,
        emissive: new THREE.Color('#000000')
      });

      if (Array.isArray(child.material)) {
        child.material = child.material.map((mat) => {
          const cloned = baseMaterial.clone();
          cloned.morphTargets = true;
          cloned.morphNormals = true;
          return cloned;
        });
      } else if (child.material) {
        const cloned = baseMaterial.clone();
        cloned.morphTargets = true;
        cloned.morphNormals = true;
        child.material = cloned;
      }

      if (child.morphTargetDictionary && child.morphTargetInfluences) {
        const dict = child.morphTargetDictionary;
        const left = findMorphIndex(dict, BLINK_KEYS);
        const right = findMorphIndex(dict, BLINK_KEYS_RIGHT);
        const smile = findMorphIndex(dict, SMILE_KEYS);
        const smileLeft = findMorphIndex(dict, SMILE_LEFT_KEYS);
        const smileRight = findMorphIndex(dict, SMILE_RIGHT_KEYS);
        const jaw = findMorphIndex(dict, JAW_KEYS);
        foundMorphs.push({ mesh: child, left, right, smile, smileLeft, smileRight, jaw });
      }
    });

    setMorphTargets(foundMorphs);
    if (foundMorphs.length === 0) {
      console.warn('Facecap: no morph targets found. Check GLB morph names.');
    } else {
      const allKeys = foundMorphs
        .map(({ mesh }) => Object.keys(mesh.morphTargetDictionary || {}))
        .flat();
      console.log('Facecap morph keys sample:', Array.from(new Set(allKeys)).slice(0, 50));
    }
  }, [faceScene]);

  const isDrive = gear === 'D';
  const isSleeping = isDrive && fsdSleep;
  const isHappy = gear === 'P';

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(t * 0.5) * 0.05;
      groupRef.current.rotation.y = Math.sin(t * 0.2) * 0.1;
    }

    if (morphTargets.length > 0) {
      const blinkVar = Math.sin(t * 4);
      const isBlinking = blinkVar > 0.95;
      const blinkTarget = isSleeping ? 1 : (isBlinking ? 1 : 0);
      const smileTarget = isHappy ? HAPPY_SMILE : 0;

      morphTargets.forEach(({ mesh, left, right, smile, smileLeft, smileRight, jaw }) => {
        const influences = mesh.morphTargetInfluences;
        if (!influences) return;

        if (left !== null) {
          influences[left] = THREE.MathUtils.lerp(influences[left], blinkTarget, 0.3);
        }
        if (right !== null) {
          influences[right] = THREE.MathUtils.lerp(influences[right], blinkTarget, 0.3);
        }
        if (smile !== null) {
          influences[smile] = THREE.MathUtils.lerp(influences[smile], smileTarget, 0.2);
        }
        if (smileLeft !== null) {
          influences[smileLeft] = THREE.MathUtils.lerp(influences[smileLeft], smileTarget, 0.2);
        }
        if (smileRight !== null) {
          influences[smileRight] = THREE.MathUtils.lerp(influences[smileRight], smileTarget, 0.2);
        }
        if (jaw !== null) {
          const jawTarget = isHappy ? 0.25 : 0;
          influences[jaw] = THREE.MathUtils.lerp(influences[jaw], jawTarget, 0.2);
        }
      });
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.6, 0]} scale={FACE_SCALE}>
      <primitive object={faceScene} />
    </group>
  );
}

export default function BrainView({ gear = 'P', fsdSleep = false }) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 0, 9], fov: 30 }}
        gl={{ alpha: true, antialias: true }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.2;
          gl.outputColorSpace = THREE.SRGBColorSpace;
        }}
      >
        <ambientLight intensity={0.9} />
        <spotLight position={[2, 5, 5]} intensity={2} color="#ffffff" />
        <spotLight position={[-2, 2, 5]} intensity={1} color="#4455ff" />

        <Suspense fallback={<Html center><div style={{ color: 'white' }}>LOADING 3D...</div></Html>}>
          <FaceCapCharacter gear={gear} fsdSleep={fsdSleep} />
        </Suspense>

        <Environment preset="city" blur={1} />
        <OrbitControls enableZoom={true} enablePan={false} minDistance={1} maxDistance={6} />
      </Canvas>
    </div>
  );
}
