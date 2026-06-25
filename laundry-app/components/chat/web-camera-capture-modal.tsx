import { MaterialCommunityIcons } from "@expo/vector-icons";
import { createElement, useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { theme } from "@/constants/theme";
import type { PickedImage } from "@/utils/pick-images";

const c = theme.colors;

type Props = {
  visible: boolean;
  onClose: () => void;
  onCapture: (image: PickedImage) => void;
};

type CameraStream = {
  stream: MediaStream;
  facingMode: "user" | "environment" | "unknown";
};

function detectFacingMode(stream: MediaStream): CameraStream["facingMode"] {
  const track = stream.getVideoTracks()[0];
  const mode = track?.getSettings?.().facingMode;
  if (mode === "user" || mode === "environment") return mode;
  return "unknown";
}

async function openCameraStream(): Promise<CameraStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera is not supported in this browser.");
  }

  const attempts: MediaStreamConstraints[] = [
    { video: { facingMode: { exact: "environment" } }, audio: false },
    { video: { facingMode: { ideal: "environment" } }, audio: false },
    { video: { facingMode: { exact: "user" } }, audio: false },
    { video: { facingMode: { ideal: "user" } }, audio: false },
    { video: true, audio: false },
  ];

  let lastError: unknown;
  for (const constraints of attempts) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      return { stream, facingMode: detectFacingMode(stream) };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Could not access camera.");
}

export function WebCameraCaptureModal({ visible, onClose, onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<CameraStream["facingMode"]>("unknown");
  const shouldUnmirrorPreview = facingMode !== "environment";

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
    setFacingMode("unknown");
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsReady(false);
  }, []);

  useEffect(() => {
    if (!visible) {
      stopStream();
      setError(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        setError(null);
        setIsReady(false);
        const nextCamera = await openCameraStream();
        if (cancelled) {
          nextCamera.stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = nextCamera.stream;
        setFacingMode(nextCamera.facingMode);
        setStream(nextCamera.stream);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not access camera.");
        }
      }
    })();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [visible, stopStream]);

  const attachVideoRef = useCallback(
    (node: HTMLVideoElement | null) => {
      videoRef.current = node;
      if (!node || !stream || !visible) return;

      node.srcObject = stream;
      node.style.width = "100%";
      node.style.height = "100%";
      node.style.objectFit = "contain";
      node.style.backgroundColor = "#000";
      node.style.transform = shouldUnmirrorPreview ? "scaleX(-1)" : "none";

      void node
        .play()
        .then(() => {
          setIsReady(true);
        })
        .catch(() => {
          setError("Could not start the camera preview.");
        });
    },
    [shouldUnmirrorPreview, stream, visible],
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream || !visible) return;

    video.style.objectFit = "contain";
    video.style.transform = shouldUnmirrorPreview ? "scaleX(-1)" : "none";
  }, [shouldUnmirrorPreview, stream, visible]);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;

    if (shouldUnmirrorPreview) {
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onCapture({
          uri: URL.createObjectURL(blob),
          mimeType: blob.type || "image/jpeg",
        });
        onClose();
      },
      "image/jpeg",
      0.85,
    );
  }, [onCapture, onClose, shouldUnmirrorPreview]);

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.screen}>
        <SafeAreaView style={styles.topBar} edges={["top"]}>
          <Pressable onPress={onClose} style={styles.topBtn} accessibilityLabel="Close camera">
            <MaterialCommunityIcons name="close" size={24} color={c.white} />
          </Pressable>
        </SafeAreaView>

        <View style={styles.previewStage}>
          {error ? (
            <View style={styles.errorWrap}>
              <MaterialCommunityIcons name="camera-off-outline" size={36} color="#fecaca" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <>
              <View style={styles.videoShell}>
                {createElement("video", {
                  ref: attachVideoRef,
                  autoPlay: true,
                  playsInline: true,
                  muted: true,
                })}
              </View>
              {!isReady ? (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator color={c.white} size="large" />
                </View>
              ) : null}
            </>
          )}
        </View>

        <SafeAreaView style={styles.bottomBar} edges={["bottom"]}>
          <View style={styles.bottomAction} />

          <Pressable
            onPress={handleCapture}
            disabled={!isReady || Boolean(error)}
            style={({ pressed }) => [
              styles.shutterOuter,
              (!isReady || error) && styles.shutterDisabled,
              pressed && styles.pressed,
            ]}
            accessibilityLabel="Capture photo"
          >
            <View style={styles.shutterInner} />
          </Pressable>

          <View style={styles.bottomAction} />
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000",
  },
  topBar: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: "rgba(3, 15, 27, 0.92)",
  },
  topBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  videoShell: {
    ...StyleSheet.absoluteFillObject,
  },
  previewStage: {
    flex: 1,
    backgroundColor: "#000",
    position: "relative",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  errorWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  errorText: {
    color: "#fecaca",
    textAlign: "center",
    lineHeight: 20,
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 28,
    paddingTop: 18,
    paddingBottom: 12,
    backgroundColor: "rgba(3, 15, 27, 0.96)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  bottomAction: {
    width: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterOuter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: c.white,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: c.white,
  },
  shutterDisabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.85,
  },
});
