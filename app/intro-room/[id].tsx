import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Theme, Colors } from '../../src/constants/colors';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/store/authStore';
import { ENV } from '../../src/lib/env';
import {
  Room,
  RoomEvent,
  Track,
  Participant,
  RemoteParticipant,
  LocalParticipant,
  ConnectionState,
  VideoPresets,
} from 'livekit-client';

interface RoomData {
  id: string;
  title: string;
  status: string;
  livekit_room_name: string | null;
  host_id: string;
  host: { display_name: string } | null;
}

interface ParticipantState {
  identity: string;
  name: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isSpeaking: boolean;
}

export default function IntroRoomScreen() {
  const { appUser } = useAuthStore();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.Disconnected);
  const [participants, setParticipants] = useState<ParticipantState[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const roomRef = useRef<Room | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!id) return;
    loadRoom();
    return () => {
      cleanup();
    };
  }, [id]);

  function cleanup() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }
  }

  async function loadRoom() {
    const { data, error } = await supabase
      .from('intro_rooms')
      .select('id, status, livekit_room_name, introduction_id, created_by')
      .eq('id', id)
      .single();

    if (error || !data) {
      // Fall back to rooms table
      const { data: roomData2, error: error2 } = await supabase
        .from('rooms')
        .select('id, title, status, livekit_room_name, host_id, host:app_users!host_id(display_name)')
        .eq('id', id)
        .maybeSingle();

      if (error2 || !roomData2) {
        Alert.alert('Error', 'Room not found.');
        router.back();
        return;
      }
      setRoomData(roomData2 as unknown as RoomData);
    } else {
      // Map intro_room to RoomData shape
      setRoomData({
        id: data.id,
        title: 'Intro Room',
        status: data.status,
        livekit_room_name: data.livekit_room_name,
        host_id: data.created_by,
        host: null,
      });
    }
    setLoading(false);
  }

  function syncParticipants(room: Room) {
    const all: ParticipantState[] = [];

    // Local participant
    const local = room.localParticipant;
    all.push({
      identity: local.identity,
      name: local.name ?? local.identity,
      isMuted: local.isMicrophoneEnabled === false,
      isVideoOff: local.isCameraEnabled === false,
      isSpeaking: local.isSpeaking,
    });

    // Remote participants
    room.remoteParticipants.forEach((p: RemoteParticipant) => {
      all.push({
        identity: p.identity,
        name: p.name ?? p.identity,
        isMuted: p.isMicrophoneEnabled === false,
        isVideoOff: p.isCameraEnabled === false,
        isSpeaking: p.isSpeaking,
      });
    });

    setParticipants(all);
  }

  async function joinRoom() {
    if (!roomData || !appUser) return;
    setConnecting(true);

    const livekitRoomName = roomData.livekit_room_name ?? `introduced-room-${roomData.id}`;

    // Update room name in DB if not set
    if (!roomData.livekit_room_name) {
      await supabase
        .from('intro_rooms')
        .update({ livekit_room_name: livekitRoomName, status: 'active' })
        .eq('id', roomData.id);
    }

    // Fetch token from Edge Function
    const { data: fnData, error: fnError } = await supabase.functions.invoke('create-livekit-token', {
      body: {
        roomName: livekitRoomName,
        participantName: appUser.display_name,
        participantId: appUser.id,
      },
    });

    if (fnError || !fnData?.token) {
      Alert.alert('Error', 'Could not get room access. Please try again.');
      setConnecting(false);
      return;
    }

    const lkToken = fnData.token;
    setToken(lkToken);

    // Create and connect LiveKit room
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: {
        resolution: VideoPresets.h360.resolution,
      },
    });

    roomRef.current = room;

    // Event listeners
    room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
      setConnectionState(state);
      if (state === ConnectionState.Connected) {
        setConnecting(false);
        syncParticipants(room);
        timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
      }
    });

    room.on(RoomEvent.ParticipantConnected, () => syncParticipants(room));
    room.on(RoomEvent.ParticipantDisconnected, () => syncParticipants(room));
    room.on(RoomEvent.TrackMuted, () => syncParticipants(room));
    room.on(RoomEvent.TrackUnmuted, () => syncParticipants(room));
    room.on(RoomEvent.ActiveSpeakersChanged, () => syncParticipants(room));

    room.on(RoomEvent.Disconnected, () => {
      setConnectionState(ConnectionState.Disconnected);
      if (timerRef.current) clearInterval(timerRef.current);
    });

    try {
      await room.connect(ENV.livekitUrl, lkToken);
      await room.localParticipant.enableCameraAndMicrophone();
      syncParticipants(room);
    } catch (err: any) {
      Alert.alert('Connection failed', err?.message ?? 'Could not connect to room.');
      setConnecting(false);
      room.disconnect();
      roomRef.current = null;
    }
  }

  async function toggleMute() {
    const room = roomRef.current;
    if (!room) return;
    const enabled = room.localParticipant.isMicrophoneEnabled;
    await room.localParticipant.setMicrophoneEnabled(!enabled);
    setIsMuted(enabled); // enabled=true means we're now muting
    syncParticipants(room);
  }

  async function toggleVideo() {
    const room = roomRef.current;
    if (!room) return;
    const enabled = room.localParticipant.isCameraEnabled;
    await room.localParticipant.setCameraEnabled(!enabled);
    setIsVideoOff(enabled);
    syncParticipants(room);
  }

  async function leaveRoom() {
    if (timerRef.current) clearInterval(timerRef.current);

    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }

    if (roomData) {
      // If host is leaving, end the room
      if (roomData.host_id === appUser?.id) {
        await supabase
          .from('intro_rooms')
          .update({ status: 'ended', ended_at: new Date().toISOString() })
          .eq('id', roomData.id);
      }
    }

    setConnectionState(ConnectionState.Disconnected);
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

  if (!roomData) return null;

  const isConnected = connectionState === ConnectionState.Connected;

  // Pre-join lobby
  if (!isConnected && !connecting) {
    return (
      <View style={styles.lobby}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </Pressable>

        <View style={styles.lobbyContent}>
          <Text style={styles.lobbyIcon}>◉</Text>
          <Text style={styles.lobbyTitle}>{roomData.title}</Text>
          {roomData.host && (
            <Text style={styles.lobbyHost}>
              Hosted by {(roomData.host as any)?.display_name ?? 'Unknown'}
            </Text>
          )}

          <View style={styles.statusRow}>
            <View style={[styles.statusDot, roomData.status === 'active' || roomData.status === 'live' ? styles.statusLive : styles.statusWaiting]} />
            <Text style={styles.statusLabel}>
              {roomData.status === 'active' || roomData.status === 'live' ? 'Live now' : 'Waiting to start'}
            </Text>
          </View>

          <View style={styles.permissionNote}>
            <Text style={styles.permissionText}>
              This room uses your camera and microphone. Make sure you're in a good place to chat.
            </Text>
          </View>

          <Pressable
            style={styles.joinBtn}
            onPress={joinRoom}
          >
            <Text style={styles.joinBtnText}>
              {roomData.status === 'active' || roomData.status === 'live' ? 'Join Room' : 'Start Room'}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Connecting state
  if (connecting || connectionState === ConnectionState.Connecting) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.blush[500]} size="large" />
        <Text style={styles.connectingText}>Connecting…</Text>
      </View>
    );
  }

  // Active room
  return (
    <View style={styles.roomContainer}>
      <View style={styles.roomHeader}>
        <Text style={styles.roomTitle}>{roomData.title}</Text>
        <Text style={styles.roomTimer}>{formatElapsed(elapsed)}</Text>
      </View>

      {/* Participant grid */}
      <ScrollView contentContainerStyle={styles.videoGrid}>
        {participants.length > 0 ? (
          participants.map((p) => (
            <VideoTile
              key={p.identity}
              name={p.name}
              muted={p.isMuted}
              videoOff={p.isVideoOff}
              isSpeaking={p.isSpeaking}
              isYou={p.identity === appUser?.id}
            />
          ))
        ) : (
          <View style={styles.centered}>
            <Text style={styles.connectingText}>Waiting for others to join…</Text>
          </View>
        )}
      </ScrollView>

      {/* Controls */}
      <View style={styles.controls}>
        <ControlBtn
          label={isMuted ? '🔇' : '🎙'}
          sublabel={isMuted ? 'Unmute' : 'Mute'}
          onPress={toggleMute}
          active={!isMuted}
        />
        <ControlBtn
          label={isVideoOff ? '📵' : '📹'}
          sublabel={isVideoOff ? 'Video off' : 'Video on'}
          onPress={toggleVideo}
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

function VideoTile({
  name, muted, videoOff, isSpeaking, isYou,
}: {
  name: string; muted: boolean; videoOff: boolean; isSpeaking: boolean; isYou?: boolean;
}) {
  return (
    <View style={[styles.videoTile, isSpeaking && styles.videoTileSpeaking]}>
      <View style={styles.tileAvatar}>
        <Text style={styles.tileInitial}>{name[0]?.toUpperCase()}</Text>
      </View>
      <Text style={styles.tileName}>{isYou ? `${name} (You)` : name}</Text>
      <View style={styles.tileIndicators}>
        {muted && <Text style={styles.tileIndicator}>🔇</Text>}
        {videoOff && <Text style={styles.tileIndicator}>📵</Text>}
        {isSpeaking && !muted && <Text style={styles.tileIndicator}>🔊</Text>}
      </View>
    </View>
  );
}

function ControlBtn({ label, sublabel, onPress, active, danger }: {
  label: string; sublabel: string; onPress: () => void; active?: boolean; danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.controlBtn,
        danger && styles.controlBtnDanger,
        active === false && styles.controlBtnOff,
      ]}
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
  centered: { flex: 1, backgroundColor: Theme.background, alignItems: 'center', justifyContent: 'center', gap: 12 },
  connectingText: { color: Colors.plum[400], fontSize: 14 },

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
  videoGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 8, gap: 8 },
  videoTile: {
    width: '47%',
    aspectRatio: 3 / 4,
    backgroundColor: Colors.plum[800],
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.plum[700],
    gap: 8,
  },
  videoTileSpeaking: {
    borderColor: Colors.blush[500],
    borderWidth: 2,
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
  controlBtnOff: { backgroundColor: '#1a0a0a', borderColor: Colors.plum[600] },
  controlBtnDanger: { backgroundColor: '#5c1a1a', borderColor: '#c0392b' },
  controlBtnEmoji: { fontSize: 24 },
  controlBtnLabel: { fontSize: 11, color: Colors.plum[300], fontWeight: '500' },
});
