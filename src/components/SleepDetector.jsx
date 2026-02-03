import React, { useEffect, useRef } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const DEFAULT_THRESHOLD = 0.22;
const CLOSED_MS = 2000;
const COOLDOWN_MS = 5000;
const ABSENT_MS = 5000;
const ABSENT_COOLDOWN_MS = 8000;
const CALIBRATION_MS = 2000;
const EAR_SMOOTHING = 5;

const LEFT_EYE = [33, 160, 158, 133, 153, 144];
const RIGHT_EYE = [263, 387, 385, 362, 380, 373];

const distance = (a, b) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
};

const computeEAR = (landmarks, indices) => {
  const p1 = landmarks[indices[0]];
  const p2 = landmarks[indices[1]];
  const p3 = landmarks[indices[2]];
  const p4 = landmarks[indices[3]];
  const p5 = landmarks[indices[4]];
  const p6 = landmarks[indices[5]];
  const vertical = distance(p2, p6) + distance(p3, p5);
  const horizontal = distance(p1, p4);
  if (horizontal <= 0) return 0;
  return vertical / (2 * horizontal);
};

export default function SleepDetector({ enabled = true, onDrowsy, onAbsent }) {
  const videoRef = useRef(null);
  const landmarkerRef = useRef(null);
  const rafRef = useRef(0);
  const streamRef = useRef(null);
  const closedStartRef = useRef(null);
  const lastTriggerRef = useRef(0);
  const absentStartRef = useRef(null);
  const lastAbsentRef = useRef(0);
  const thresholdRef = useRef(DEFAULT_THRESHOLD);
  const calibrationRef = useRef({
    start: 0,
    samples: []
  });
  const earHistoryRef = useRef([]);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;

    const setup = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (err) {
        console.warn('[SleepDetector] Webcam permission denied or unavailable.', err);
        return;
      }

      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
      landmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: '/models/face_landmarker.task'
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: false
      });

      calibrationRef.current = {
        start: performance.now(),
        samples: []
      };

      const tick = (now) => {
        if (cancelled || !videoRef.current || !landmarkerRef.current) return;
        const video = videoRef.current;
        if (video.readyState < 2) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }

        const result = landmarkerRef.current.detectForVideo(video, now);
        const face = result.faceLandmarks?.[0];
        if (!face) {
          closedStartRef.current = null;
          if (!absentStartRef.current) {
            absentStartRef.current = now;
          } else if (now - absentStartRef.current >= ABSENT_MS) {
            if (now - lastAbsentRef.current > ABSENT_COOLDOWN_MS) {
              lastAbsentRef.current = now;
              if (onAbsent) onAbsent();
            }
          }
          rafRef.current = requestAnimationFrame(tick);
          return;
        }
        absentStartRef.current = null;

        const leftEar = computeEAR(face, LEFT_EYE);
        const rightEar = computeEAR(face, RIGHT_EYE);
        const ear = (leftEar + rightEar) * 0.5;

        earHistoryRef.current.push(ear);
        if (earHistoryRef.current.length > EAR_SMOOTHING) {
          earHistoryRef.current.shift();
        }
        const smoothEar =
          earHistoryRef.current.reduce((sum, v) => sum + v, 0) /
          earHistoryRef.current.length;

        const calibration = calibrationRef.current;
        if (now - calibration.start < CALIBRATION_MS) {
          calibration.samples.push(smoothEar);
        } else if (calibration.samples.length > 0) {
          const avg =
            calibration.samples.reduce((sum, v) => sum + v, 0) /
            calibration.samples.length;
          thresholdRef.current = Math.min(0.3, Math.max(0.15, avg * 0.7));
          calibration.samples = [];
        }

        if (smoothEar > 0 && smoothEar < thresholdRef.current) {
          if (!closedStartRef.current) {
            closedStartRef.current = now;
          } else if (now - closedStartRef.current >= CLOSED_MS) {
            if (now - lastTriggerRef.current > COOLDOWN_MS) {
              lastTriggerRef.current = now;
              if (onDrowsy) onDrowsy();
            }
          }
        } else {
          closedStartRef.current = null;
        }

        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    };

    setup();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      if (landmarkerRef.current?.close) {
        landmarkerRef.current.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [enabled, onDrowsy]);

  return <video ref={videoRef} muted playsInline style={{ display: 'none' }} />;
}
