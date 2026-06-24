import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Theme, Colors } from '../../src/constants/colors';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/store/authStore';

// LiveKit SDK — expo-compatible wrapper
// In production: npm install @livekit/react-native @livekit/react-native-webrtc
// These imports are guarded so the app doesn't crash if the package isn't installed yet
let useLiveKitRoom: any = null;
let VideoTrack: any = null;
let AudioTrack: any = null;
let RoomEvent: any = null;
try {
  const lk = require('@livekit/react-native');
  useLiveKitRoom = lk.useLiveKitRoom;
  VideoTrack = lk.VideoTrack;
  AudioTrack = lk.AudioTrack;
  RoomEvent = lk.RoomEvent;
} catch {
  // Package not yet installed — show placeholder UI
}

interface RoomParticipant {
  id: string;
  display_name: string;
  isMuted: boolean;
  isVideoOff: boolean;
}

interface RoomData {
  id: string;
  title: string;
  status: string;
  livekit_room_name: string | null;
  host_id: string;
  host: { display_name: string } | null;
}

export default function IntroRoomScreen() {
  const { appUser } = useAuthStore();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [room, setRoom] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!id) return;
    loadRoom();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [id]);

  async function loadRoom() {
    const { data, error } = await supabase
      .from('rooms')
      .select('id, title, status, livekit_room_name, host_id, host:app_users!host_id(display_name)')
      .eq('id', id)
      .single();

    if (error || !data) {
      Alert.alert('Error', 'Room not found.');
      router.back();
      return;
    }

    setRoom(data as unknown as RoomData);
    setLoading(false);
  }

  async function joinRoom() {
    if (!room || !appUser) return;
    setConnecting(true);

    const roomName = room.livekit_room_name ?? `introduced-room-${room.id}`;

    // If no livekit_room_name set yet, update it
    if (!room.livekit_room_name) {
      await supabase
        .from('rooms')
        .update({ livekit_room_name: roomName, status: 'live' })
        .eq('id', room.id);
    }

    // Fetch LiveKit token from Edge Function
    const { data: fnData, error: fnError } = await supabase.functions.invoke('create-livekit-token', {
      body: {
        roomName,
        participantName: appUser.display_name,
        participantId: appUser.id,
      },
    });

    if (fnError || !fnData?.token) {
      Alert.alert('Error', 'Could not get room access. Please try again.');
      setConnecting(false);
      return;
    }

    setToken(fnData.token);
    setConnected(true);
    setConnecting(false);

    // Start elapsed timer
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);

    // Update participant count
    await supabase.rpc('increment_room_participants', { room_id: room.id });
  }

  async function leaveRoom() {
    if (timerRef.current) clearInterval(timerRef.current);

    if (room) {
      await supabase.rpc('decrement_room_participants', { room_id: room.id });

      // If host is leaving, end the room
      if (room.host_id === appUser?.id) {
        await supabase
          .from('rooms')
          .update({ status: 'ended' })
          .eq('id', room.id);
      }
    }

    setConnected(false);
    setToken(null);
    router.back();
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.blush[500]} size="large" />
      </View>
    );
  }

  if (!room) return null;

  // Pre-join lobby
  if (!connected) {
    return (
      <View style={styles.lobby}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </Pressable>

        <View style={styles.lobbyContent}>
          <Text style={styles.lobbyIcon}>◉</Text>
          <Text style={styles.lobbyTitle}>{room.title}</Text>
          <Text style={styles.lobbyHost}>
            Hosted by {(room.host as any)?.display_name ?? 'Unknown'}
          </Text>

          <View style={styles.statusRow}>
            <View style={[styles.statusDot, room.status === 'live' ? styles.statusLive : styles.statusWaiting]} />
            <Text style={styles.statusLabel}>{room.status === 'live' ? 'Live now' : 'Waiting to start'}</Text>
          </View>

          <View style={styles.permissionNote}>
            <Text style={styles.permissionText}>
              This room uses your camera and microphone. Make sure you're in a good place to chat.
            </Text>
          </View>

          <Pressable
            style={[styles.joinBtn, connecting && styles.joinBtnDisabled]}
            onPress={joinRoom}
            disabled={connecting}
          >
            {connecting ? (
              <ActivityIndicator color={Colors.ivory} />
            ) : (
              <Text style={styles.joinBtnText}>
                {room.status === 'live' ? 'Join Room' : 'Start Room'}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    );
  }

  // Active room UI
  return (
    <View style={styles.roomContainer}>
      {/* Header */}
      <View style={styles.roomHeader}>
        <Text style={styles.roomTitle}>{room.title}</Text>
        <Text style={styles.roomTimer}>{formatElapsed(elapsed)}</Text>
      </View>

      {/* If LiveKit SDK not installed, show placeholder video tiles */}
      {!useLiveKitRoom ? (
        <View style={styles.videoGrid}>
          <VideoTile name={appUser?.display_name ?? 'You'} muted={isMuted} videoOff={isVideoOff} isYou />
          <VideoTile name={(room.host as any)?.display_name ?? 'Guest'} muted={false} videoOff={false} />
        </View>
      ) : (
        <LiveKitVideoGrid token={token!} roomUrl={process.env.EXPO_PUBLIC_LIVEKIT_URL ?? ''} />
      )}

      {/* Controls */}
      <View style={styles.controls}>
        <ControlBtn
          label={isMuted ? '🔇' : '🎙'}
          sublabel={isMuted ? 'Unmute' : 'Mute'}
          onPress={() => setIsMuted(!isMuted)}
          active={!isMuted}
        />
        <ControlBtn
          label={isVideoOff ? '📵' : '📹'}
          sublabel={isVideoOff ? 'Video off' : 'Video on'}
          onPress={() => setIsVideoOff(!isVideoOff)}
          active={!isVideoOff}
        />
        <ControlBtn
          label="📞"
          sublabel="Leave"
          onPress={() => {
            Alert.alert('Leave Room?', 'Are you sure you want to leave?', [
              { text: 'Stay', style: 'cancel' },
              { text: 'Leave', style: 'destructive', onPress: leaveRoom },
            ]);
          }}
          danger
        />
      </View>
    </View>
  );
}

// Placeholder tile when SDK not installed
function VideoTile({ name, muted, videoOff, isYou }: { name: string; muted: boolean; videoOff: boolean; isYou?: boolean }) {
  return (
    <View style={styles.videoTile}>
      <View style={styles.tileAvatar}>
        <Text style={styles.tileInitial}>{name[0]?.toUpperCase()}</Text>
      </View>
      <Text style={styles.tileName}>{isYou ? `${name} (You)` : name}</Text>
      <View style={styles.tileIndicators}>
        {muted && <Text style={styles.tileIndicator}>🔇</Text>}
        {videoOff && <Text style={styles.tileIndicator}>📵</Text>}
      </View>
    </View>
  );
}

// LiveKit video grid — only rendered when SDK is available
function LiveKitVideoGrid({ token, roomUrl }: { token: string; roomUrl: string }) {
  return (
    <View style={styles.videoGrid}>
      <Text style={styles.lkPlaceholder}>LiveKit connected</Text>
    </View>
  );
}

function ControlBtn({ label, sublabel, onPress, active, danger }: {
  label: string; sublabel: string; onPress: () => void; active?: boolean; danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.controlBtn, danger && styles.controlBtnDanger, active === false && styles.controlBtnOff]}
    >
      <Text style={styles.controlBtnEmoji}>{label}</Text>
      <Text style={styles.controlBtnLabel}>{sublabel}</Text>
    </Pressable>
  );
}

function formatElapsed(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const styles = StyleSheet.create({
  centered: { flex: 1, backgroundColor: Theme.background, alignItems: 'center', justifyContent: 'center' },

  // Lobby
  lobby: { flex: 1, backgroundColor: Theme.background },
  backBtn: { paddingTop: Platform.OS === 'ios' ? 56 : 24, paddingHorizontal: 20, paddingBottom: 8 },
  backBtnText: { color: Colors.plum[400], fontSize: 15 },
  lobbyContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  lobbyIcon: { fontSize: 52, color: Colors.plum[600] },
  lobbyTitle: { fontSize: 24, fontWeight: '700', color: Colors.ivory, textAlign: 'center' },
  lobbyHost: { fontSize: 14, color: Colors.plum[400] },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusLive: { backgroundColor: Colors.blush[500] },
  statusWaiting: { backgroundColor: Colors.champagne[400] },
  statusLabel: { fontSize: 14, color: Colors.plum[300] },
  permissionNote: {
    backgroundColor: Colors.plum[800],
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.plum[700],
    marginTop: 8,
  },
  permissionText: { fontSize: 13, color: Colors.plum[300], textAlign: 'center', lineHeight: 19 },
  joinBtn: {
    marginTop: 12,
    backgroundColor: Colors.blush[500],
    borderRadius: 28,
    paddingHorizontal: 48,
    paddingVertical: 16,
    minWidth: 200,
    alignItems: 'center',
  },
  joinBtnDisabled: { opacity: 0.5 },
  joinBtnText: { color: Colors.ivory, fontWeight: '700', fontSize: 18 },

  // Active room
  roomContainer: { flex: 1, backgroundColor: '#0A0612' },
  roomHeader: {
    paddingTop: Platform.OS === 'ios' ? 56 : 24,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roomTitle: { fontSize: 17, fontWeight: '600', color: Colors.ivory },
  roomTimer: { fontSize: 15, color: Colors.blush[400], fontWeight: '600' },
  videoGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', padding: 8, gap: 8 },
  videoTile: {
    flex: 1,
    minWidth: '45%',
    aspectRatio: 3 / 4,
    backgroundColor: Colors.plum[800],
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.plum[700],
    gap: 8,
  },
  tileAvatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.plum[700],
    borderWidth: 2, borderColor: Colors.blush[500],
    alignItems: 'center', justifyContent: 'center',
  },
  tileInitial: { fontSize: 28, fontWeight: '700', color: Colors.blush[400] },
  tileName: { fontSize: 14, color: Colors.ivory, fontWeight: '600' },
  tileIndicators: { flexDirection: 'row', gap: 6 },
  tileIndicator: { fontSize: 16 },
  lkPlaceholder: { color: Colors.plum[400], fontSize: 14 },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingVertical: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    backgroundColor: '#0A0612',
  },
  controlBtn: {
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.plum[800],
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.plum[700],
    minWidth: 80,
  },
  controlBtnOff: { backgroundColor: Colors.plum[900] ?? Colors.plum[800], borderColor: Colors.plum[600] },
  controlBtnDanger: { backgroundColor: '#5c1a1a', borderColor: '#c0392b' },
  controlBtnEmoji: { fontSize: 24 },
  controlBtnLabel: { fontSize: 11, color: Colors.plum[300], fontWeight: '500' },
});
