import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { BottomTabs, type AppTab } from './components/BottomTabs';
import { BrandPill } from './components/BrandPill';
import { AuthScreen } from './components/AuthScreen';
import { MessageBubble } from './components/MessageBubble';
import { RoomCard } from './components/RoomCard';
import { loadCatalog, publishMessage } from './services/catalogService';
import {
  clearStoredSession,
  getCurrentSessionUser,
  loginWithEmail,
  persistSession,
  registerWithEmail,
  restoreStoredSession
} from './services/authService';
import { theme } from './theme';
import { AuthMode, AuthSession, CatalogData, DataSource, RideEvent, Room } from './types';

const initialJoinedRooms = ['honda-pcx-125', 'yamaha-mt-07'];
const appLogo = require('../assets/icon.png');

type BrandFilter = {
  id: string;
  name: string;
  subtitle: string;
  accent: string;
};

type AuthFormState = {
  displayName: string;
  email: string;
  city: string;
  password: string;
};

const emptyAuthForm: AuthFormState = {
  displayName: '',
  email: '',
  city: '',
  password: ''
};

const StatCard = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.statCard}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const RideCard = ({
  accent,
  event,
  room,
  onOpenRoom
}: {
  accent: string;
  event: RideEvent;
  room: Room;
  onOpenRoom: (roomId: string) => void;
}) => (
  <Pressable onPress={() => onOpenRoom(room.id)} style={({ pressed }) => [styles.rideCard, pressed && styles.pressed]}>
    <View style={[styles.rideAccent, { backgroundColor: accent }]} />
    <Text style={styles.rideTitle}>{event.title}</Text>
    <Text style={styles.rideMeta}>
      {room.modelName} · {event.city} · {event.dateLabel}
    </Text>
    <Text style={styles.rideAttendees}>{event.attendees} kişi katılım gösterdi</Text>
  </Pressable>
);

const getBrandAccent = (catalog: CatalogData | null, brandId: string) =>
  catalog?.brands.find((brand) => brand.id === brandId)?.accent ?? theme.colors.accent;

export default function MotoRoomApp() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [authBootstrapping, setAuthBootstrapping] = useState(true);
  const [catalog, setCatalog] = useState<CatalogData | null>(null);
  const [dataSource, setDataSource] = useState<DataSource>('mock');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AppTab>('discover');
  const [selectedBrandId, setSelectedBrandId] = useState('all');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [joinedRoomIds, setJoinedRoomIds] = useState<string[]>(initialJoinedRooms);
  const [searchQuery, setSearchQuery] = useState('');
  const [draftMessage, setDraftMessage] = useState('');
  const [postingMessage, setPostingMessage] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authForm, setAuthForm] = useState<AuthFormState>(emptyAuthForm);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  useEffect(() => {
    const bootstrapAuth = async () => {
      try {
        const storedSession = await restoreStoredSession();
        if (!storedSession) {
          return;
        }

        const payload = await getCurrentSessionUser(storedSession.token);
        const nextSession = {
          token: storedSession.token,
          user: payload.user
        };
        await persistSession(nextSession);
        setSession(nextSession);
      } catch {
        await clearStoredSession();
      } finally {
        setAuthBootstrapping(false);
      }
    };

    void bootstrapAuth();
  }, []);

  useEffect(() => {
    if (!session) {
      setCatalog(null);
      setLoading(false);
      return;
    }

    const bootstrapCatalog = async () => {
      setLoading(true);

      try {
        const result = await loadCatalog();
        setCatalog(result.catalog);
        setDataSource(result.source);
        setError(null);
      } catch {
        setError('Veri yüklenemedi. Uygulama başlangıç durumuna geçemedi.');
      } finally {
        setLoading(false);
      }
    };

    void bootstrapCatalog();
  }, [session]);

  const brandFilters = useMemo<BrandFilter[]>(
    () => [
      {
        id: 'all',
        name: 'Tümü',
        subtitle: 'Tüm marka ve model odaları',
        accent: theme.colors.overlay
      },
      ...(catalog?.brands ?? [])
    ],
    [catalog]
  );

  const filteredRooms = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase('tr-TR');

    return (catalog?.rooms ?? []).filter((room) => {
      const matchesBrand = selectedBrandId === 'all' || room.brandId === selectedBrandId;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        room.modelName.toLocaleLowerCase('tr-TR').includes(normalizedQuery) ||
        room.tags.some((tag) => tag.toLocaleLowerCase('tr-TR').includes(normalizedQuery)) ||
        room.description.toLocaleLowerCase('tr-TR').includes(normalizedQuery);

      return matchesBrand && matchesQuery;
    });
  }, [catalog, searchQuery, selectedBrandId]);

  const joinedRooms = useMemo(
    () => (catalog?.rooms ?? []).filter((room) => joinedRoomIds.includes(room.id)),
    [catalog, joinedRoomIds]
  );

  const selectedRoom = useMemo(
    () => catalog?.rooms.find((room) => room.id === selectedRoomId) ?? null,
    [catalog, selectedRoomId]
  );

  const rideFeed = useMemo(
    () =>
      (catalog?.rooms ?? []).flatMap((room) =>
        room.meetups.map((event) => ({
          event,
          room
        }))
      ),
    [catalog]
  );

  const handleOpenRoom = (roomId: string) => {
    setSelectedRoomId(roomId);
    setActiveTab('rooms');
    setJoinedRoomIds((current) => (current.includes(roomId) ? current : [roomId, ...current]));
  };

  const handleBackFromRoom = () => {
    setSelectedRoomId(null);
    setDraftMessage('');
  };

  const handleAuthFieldChange = (
    field: 'displayName' | 'email' | 'city' | 'password',
    value: string
  ) => {
    setAuthForm((current) => ({
      ...current,
      [field]: value
    }));
  };

  const handleAuthModeChange = (mode: AuthMode) => {
    setAuthMode(mode);
    setAuthError(null);
  };

  const handleAuthSubmit = async () => {
    setAuthError(null);
    setAuthSubmitting(true);

    try {
      const nextSession =
        authMode === 'register'
          ? await registerWithEmail({
              displayName: authForm.displayName,
              email: authForm.email,
              city: authForm.city,
              password: authForm.password
            })
          : await loginWithEmail({
              email: authForm.email,
              password: authForm.password
            });

      setSession(nextSession);
      setAuthForm(emptyAuthForm);
    } catch (authFlowError) {
      setAuthError(authFlowError instanceof Error ? authFlowError.message : 'Giriş işlemi başarısız oldu.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await clearStoredSession();
    setSession(null);
    setSelectedRoomId(null);
    setSearchQuery('');
    setDraftMessage('');
    setAuthError(null);
    setActiveTab('discover');
  };

  const handleSendMessage = async () => {
    const trimmedDraft = draftMessage.trim();

    if (!selectedRoom || trimmedDraft.length === 0 || postingMessage || !session) {
      return;
    }

    setPostingMessage(true);

    try {
      const result = await publishMessage(selectedRoom.id, {
        authorName: session.user.displayName,
        city: session.user.city,
        body: trimmedDraft
      });

      setDataSource(result.source);
      setCatalog((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          rooms: current.rooms.map((room) =>
            room.id === selectedRoom.id
              ? {
                  ...room,
                  archivedMessageCount: room.archivedMessageCount + 1,
                  messages: [result.message, ...room.messages]
                }
              : room
          )
        };
      });
      setDraftMessage('');
    } catch {
      setError('Mesaj gönderilemedi.');
    } finally {
      setPostingMessage(false);
    }
  };

  const discoverEmptyState = (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyTitle}>Araman için oda bulunamadı</Text>
      <Text style={styles.emptyBody}>Marka filtresini sıfırla ya da model ismini biraz daha geniş arat.</Text>
    </View>
  );

  const discoverScreen = (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.heroCard}>
        <View style={styles.heroCirclePrimary} />
        <View style={styles.heroCircleSecondary} />
        <Text style={styles.eyebrow}>MotoRoom MVP</Text>
        <Text style={styles.heroTitle}>Motosiklet modelini seç, doğrudan odasına gir.</Text>
        <Text style={styles.heroBody}>
          Forum arşivini, gerçek zamanlı sohbeti ve şehir bazlı buluşmaları tek akışta birleştiren model bazlı topluluk.
        </Text>

        <View style={styles.sourceBadge}>
          <View
            style={[
              styles.sourceDot,
              { backgroundColor: dataSource === 'api' ? theme.colors.success : theme.colors.accentDeep }
            ]}
          />
          <Text style={styles.sourceText}>
            {dataSource === 'api' ? 'Yerel backend bağlı' : 'Demo veri ile gösterim'}
          </Text>
        </View>
      </View>

      <View style={styles.statRow}>
        <StatCard label="Sezon sinyali" value={catalog?.highlights.summerTrend ?? '-'} />
        <StatCard label="Aktif şehirler" value={catalog?.highlights.activeRideCities ?? '-'} />
        <StatCard label="Cevaplanan soru" value={catalog?.highlights.answeredQuestions ?? '-'} />
      </View>

      <TextInput
        placeholder="Model, etiket veya problem ara"
        placeholderTextColor="#8A7D70"
        style={styles.searchInput}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <Text style={styles.sectionTitle}>Markaya göre gir</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.brandRail}>
        {brandFilters.map((brand) => (
          <BrandPill
            key={brand.id}
            accent={brand.accent}
            id={brand.id}
            name={brand.name}
            onPress={setSelectedBrandId}
            selected={selectedBrandId === brand.id}
            subtitle={brand.subtitle}
          />
        ))}
      </ScrollView>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Odalar</Text>
        <Text style={styles.sectionMeta}>{filteredRooms.length} sonuç</Text>
      </View>

      {filteredRooms.length > 0
        ? filteredRooms.map((room) => (
            <RoomCard
              key={room.id}
              accent={getBrandAccent(catalog, room.brandId)}
              joined={joinedRoomIds.includes(room.id)}
              room={room}
              onPress={handleOpenRoom}
            />
          ))
        : discoverEmptyState}
    </ScrollView>
  );

  const roomsScreen = selectedRoom ? (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 0}
      style={styles.roomScreen}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Pressable onPress={handleBackFromRoom} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <Ionicons name="chevron-back" size={16} color={theme.colors.ink} />
          <Text style={styles.backButtonText}>Odalarıma dön</Text>
        </Pressable>

        <View style={styles.roomHero}>
          <Text style={styles.roomTitle}>{selectedRoom.modelName}</Text>
          <Text style={styles.roomSubtitle}>
            {selectedRoom.segment} · {selectedRoom.engine} · {selectedRoom.memberCount.toLocaleString('tr-TR')} üye
          </Text>
          <Text style={styles.roomBody}>{selectedRoom.description}</Text>

          <View style={styles.roomMetrics}>
            <Text style={styles.roomMetric}>{selectedRoom.ridersOnline} kişi şu an sohbette</Text>
            <Text style={styles.roomMetric}>{selectedRoom.archivedMessageCount.toLocaleString('tr-TR')} arşiv mesajı</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Sabit bilgi</Text>
        {selectedRoom.pinnedInsights.map((insight) => (
          <View key={insight.title} style={styles.insightCard}>
            <Text style={styles.insightTitle}>{insight.title}</Text>
            <Text style={styles.insightBody}>{insight.detail}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Geçmiş konuşmalar</Text>
        {selectedRoom.messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </ScrollView>

      <View style={styles.composerWrap}>
        <TextInput
          multiline
          placeholder="Sorunu, tavsiyeni ya da buluşma fikrini yaz"
          placeholderTextColor="#8A7D70"
          style={styles.composerInput}
          value={draftMessage}
          onChangeText={setDraftMessage}
        />
        <Pressable
          onPress={handleSendMessage}
          style={({ pressed }) => [
            styles.sendButton,
            (postingMessage || draftMessage.trim().length === 0) && styles.sendButtonDisabled,
            pressed && styles.pressed
          ]}
        >
          {postingMessage ? (
            <ActivityIndicator color={theme.colors.card} />
          ) : (
            <Ionicons name="arrow-up" size={20} color={theme.colors.card} />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  ) : (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Katıldığın odalar</Text>
        <Text style={styles.sectionMeta}>{joinedRooms.length} oda</Text>
      </View>

      {joinedRooms.length > 0 ? (
        joinedRooms.map((room) => (
          <RoomCard
            key={room.id}
            accent={getBrandAccent(catalog, room.brandId)}
            joined
            room={room}
            onPress={handleOpenRoom}
          />
        ))
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Henüz bir odaya katılmadın</Text>
          <Text style={styles.emptyBody}>Keşfet sekmesinden marka ve model seçip odanı oluşturabilirsin.</Text>
        </View>
      )}
    </ScrollView>
  );

  const ridesScreen = (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Yaz buluşmaları</Text>
      <Text style={styles.sectionLead}>
        Model odalarından çıkan rota ve tanışma planları burada toplanıyor. Bir buluşmaya dokununca ilgili odaya geçersin.
      </Text>

      {rideFeed.map(({ event, room }) => (
        <RideCard
          key={event.id}
          accent={getBrandAccent(catalog, room.brandId)}
          event={event}
          room={room}
          onOpenRoom={handleOpenRoom}
        />
      ))}
    </ScrollView>
  );

  const activeScreen = activeTab === 'discover' ? discoverScreen : activeTab === 'rooms' ? roomsScreen : ridesScreen;

  return (
    <View style={styles.appShell}>
      <StatusBar style="dark" />
      <View style={styles.backgroundOrbOne} />
      <View style={styles.backgroundOrbTwo} />

      <View style={styles.safeContainer}>
        <View style={styles.headerBar}>
          <View style={styles.headerBrand}>
            <View style={styles.headerLogoWrap}>
              <Image source={appLogo} style={styles.headerLogo} />
            </View>
            <View>
              <Text style={styles.headerTitle}>MotoRoom</Text>
              <Text style={styles.headerSubtitle}>
                {session ? `${session.user.displayName} · ${session.user.city}` : 'Motorcular için girişli topluluk'}
              </Text>
            </View>
          </View>

          {session ? (
            <View style={styles.sessionActions}>
              <View style={styles.userBubble}>
                <Text style={styles.userBubbleText}>{session.user.displayName.slice(0, 1).toUpperCase()}</Text>
              </View>
              <Pressable onPress={handleSignOut} style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}>
                <Ionicons name="log-out-outline" size={18} color={theme.colors.card} />
              </Pressable>
            </View>
          ) : (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>AUTH</Text>
            </View>
          )}
        </View>

        {authBootstrapping ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={theme.colors.accentDeep} size="large" />
            <Text style={styles.loadingText}>Oturum hazırlanıyor...</Text>
          </View>
        ) : !session ? (
          <AuthScreen
            city={authForm.city}
            displayName={authForm.displayName}
            email={authForm.email}
            error={authError}
            loading={authSubmitting}
            mode={authMode}
            onFieldChange={handleAuthFieldChange}
            onModeChange={handleAuthModeChange}
            onSubmit={handleAuthSubmit}
            password={authForm.password}
          />
        ) : loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={theme.colors.accentDeep} size="large" />
            <Text style={styles.loadingText}>Model odaları hazırlanıyor...</Text>
          </View>
        ) : error ? (
          <View style={styles.loadingState}>
            <Text style={styles.errorTitle}>Başlangıç yüklenemedi</Text>
            <Text style={styles.errorBody}>{error}</Text>
          </View>
        ) : (
          <>
            <View style={styles.contentWrap}>{activeScreen}</View>
            <BottomTabs activeTab={activeTab} onChange={setActiveTab} />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  appShell: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  safeContainer: {
    flex: 1,
    paddingTop: 58
  },
  backgroundOrbOne: {
    position: 'absolute',
    top: -110,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 220,
    backgroundColor: '#FFBC86'
  },
  backgroundOrbTwo: {
    position: 'absolute',
    left: -60,
    top: 110,
    width: 140,
    height: 140,
    borderRadius: 140,
    backgroundColor: '#F3D3B3'
  },
  headerBar: {
    paddingHorizontal: 22,
    paddingBottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerLogoWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4
    }
  },
  headerLogo: {
    width: 34,
    height: 34,
    borderRadius: 10
  },
  headerTitle: {
    color: theme.colors.ink,
    fontSize: 28,
    fontWeight: '900'
  },
  headerSubtitle: {
    color: theme.colors.muted,
    fontSize: 13,
    marginTop: 4
  },
  headerBadge: {
    backgroundColor: theme.colors.overlay,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: theme.radius.pill
  },
  headerBadgeText: {
    color: theme.colors.card,
    fontSize: 12,
    fontWeight: '800'
  },
  sessionActions: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  userBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: 8
  },
  userBubbleText: {
    color: theme.colors.ink,
    fontSize: 14,
    fontWeight: '900'
  },
  logoutButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.overlay
  },
  contentWrap: {
    flex: 1
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingBottom: 28
  },
  heroCard: {
    backgroundColor: '#22160E',
    borderRadius: theme.radius.lg,
    padding: 22,
    overflow: 'hidden',
    marginBottom: 20
  },
  heroCirclePrimary: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 180,
    right: -55,
    top: -40,
    backgroundColor: '#F26A1B'
  },
  heroCircleSecondary: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 110,
    right: 70,
    bottom: -50,
    backgroundColor: '#195E53'
  },
  eyebrow: {
    color: '#F7C18A',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1
  },
  heroTitle: {
    color: theme.colors.card,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
    marginTop: 10,
    maxWidth: '80%'
  },
  heroBody: {
    color: '#E8DCCF',
    fontSize: 15,
    lineHeight: 23,
    marginTop: 14,
    maxWidth: '86%'
  },
  sourceBadge: {
    marginTop: 18,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34251A',
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  sourceDot: {
    width: 10,
    height: 10,
    borderRadius: 10,
    marginRight: 8
  },
  sourceText: {
    color: theme.colors.card,
    fontSize: 12,
    fontWeight: '700'
  },
  statRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14
  },
  statValue: {
    color: theme.colors.ink,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800'
  },
  statLabel: {
    color: theme.colors.muted,
    fontSize: 12,
    marginTop: 8
  },
  searchInput: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 15,
    color: theme.colors.ink,
    fontSize: 15,
    marginBottom: 18
  },
  brandRail: {
    paddingBottom: 8
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  sectionTitle: {
    color: theme.colors.ink,
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 12
  },
  sectionMeta: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '700'
  },
  sectionLead: {
    color: theme.colors.muted,
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 20
  },
  emptyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 18
  },
  emptyTitle: {
    color: theme.colors.ink,
    fontSize: 17,
    fontWeight: '800'
  },
  emptyBody: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8
  },
  roomScreen: {
    flex: 1
  },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14
  },
  backButtonText: {
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 6
  },
  roomHero: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 20,
    marginBottom: 20
  },
  roomTitle: {
    color: theme.colors.ink,
    fontSize: 30,
    fontWeight: '900'
  },
  roomSubtitle: {
    color: theme.colors.muted,
    fontSize: 14,
    marginTop: 6
  },
  roomBody: {
    color: theme.colors.ink,
    fontSize: 15,
    lineHeight: 23,
    marginTop: 16
  },
  roomMetrics: {
    marginTop: 18,
    gap: 8
  },
  roomMetric: {
    color: theme.colors.accentDeep,
    fontSize: 13,
    fontWeight: '700'
  },
  insightCard: {
    backgroundColor: '#FFF4E8',
    borderRadius: theme.radius.md,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3D3B2'
  },
  insightTitle: {
    color: theme.colors.ink,
    fontSize: 15,
    fontWeight: '800'
  },
  insightBody: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8
  },
  composerWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 26 : 18,
    backgroundColor: '#F8F2EA',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border
  },
  composerInput: {
    flex: 1,
    maxHeight: 110,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.ink,
    fontSize: 15
  },
  sendButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accentDeep
  },
  sendButtonDisabled: {
    opacity: 0.45
  },
  rideCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 18,
    paddingLeft: 22,
    marginBottom: 14
  },
  rideAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
    borderTopLeftRadius: theme.radius.lg,
    borderBottomLeftRadius: theme.radius.lg
  },
  rideTitle: {
    color: theme.colors.ink,
    fontSize: 18,
    fontWeight: '800'
  },
  rideMeta: {
    color: theme.colors.muted,
    fontSize: 13,
    marginTop: 8
  },
  rideAttendees: {
    color: theme.colors.accentDeep,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 12
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32
  },
  loadingText: {
    color: theme.colors.muted,
    fontSize: 15,
    marginTop: 14
  },
  errorTitle: {
    color: theme.colors.ink,
    fontSize: 24,
    fontWeight: '900'
  },
  errorBody: {
    color: theme.colors.muted,
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
    marginTop: 10
  },
  pressed: {
    opacity: 0.86
  }
});
