import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AuthScreen } from './components/AuthScreen';
import { BottomTabs, type AppTab } from './components/BottomTabs';
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
import { AuthMode, AuthSession, CatalogData, DataSource, RideEvent, Room, RoomMessage } from './types';

const initialJoinedRooms = ['honda-pcx-125', 'yamaha-mt-07'];
const appLogo = require('../assets/icon.png');

type VehicleFilter = 'all' | 'automobile' | 'motorcycle';

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

const clubImages = [
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1558981285-6f0c94958bb6?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?auto=format&fit=crop&w=900&q=80'
];

const getRoomImage = (room: Room, index = 0) => {
  const seed = room.id.split('').reduce((total, char) => total + char.charCodeAt(0), index);
  return clubImages[seed % clubImages.length];
};

const getVehicleCategory = (room: Room): VehicleFilter => {
  const automobileHints = ['s40', 'e90', 'series', 'porsche', 'jdm', 'volvo'];
  const haystack = `${room.id} ${room.modelName} ${room.segment}`.toLocaleLowerCase('en-US');
  return automobileHints.some((hint) => haystack.includes(hint)) ? 'automobile' : 'motorcycle';
};

const formatNumber = (value: number) =>
  value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K` : String(value);

const AppHeader = ({
  session,
  onSignOut
}: {
  session: AuthSession;
  onSignOut: () => void;
}) => (
  <View style={styles.headerBar}>
    <Image source={appLogo} style={styles.headerAvatar} />
    <View style={styles.headerCopy}>
      <Text style={styles.headerWordmark}>MOTOROOM</Text>
      <Text style={styles.headerSubtitle}>{session.user.displayName.toLocaleUpperCase('tr-TR')} / {session.user.city.toLocaleUpperCase('tr-TR')}</Text>
    </View>
    <Pressable onPress={onSignOut} style={({ pressed }) => [styles.headerIconButton, pressed && styles.pressed]}>
      <Ionicons name="log-out-outline" size={24} color={theme.colors.accent} />
    </Pressable>
  </View>
);

const SectionTitle = ({ children }: { children: string }) => (
  <View style={styles.sectionTitleWrap}>
    <View style={styles.sectionRail} />
    <Text style={styles.sectionTitle}>{children}</Text>
  </View>
);

const FilterButton = ({
  label,
  selected,
  onPress
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) => (
  <Pressable onPress={onPress} style={({ pressed }) => [styles.filterButton, selected && styles.filterButtonActive, pressed && styles.pressed]}>
    <Text style={[styles.filterText, selected && styles.filterTextActive]}>{label}</Text>
  </Pressable>
);

const PopularCard = ({
  room,
  imageUri,
  onOpenRoom
}: {
  room: Room;
  imageUri: string;
  onOpenRoom: (roomId: string) => void;
}) => (
  <Pressable onPress={() => onOpenRoom(room.id)} style={({ pressed }) => [styles.popularCard, pressed && styles.pressed]}>
    <Image source={{ uri: imageUri }} style={styles.popularImage} />
    <View style={styles.popularShade} />
    <View style={styles.popularBadge}>
      <Text style={styles.popularBadgeText}>{getVehicleCategory(room) === 'automobile' ? 'SEÇKİN' : 'SOKAK'}</Text>
    </View>
    <Text style={styles.popularName}>{room.modelName.toLocaleUpperCase('tr-TR')} KOLEKTİFİ</Text>
    <Text style={styles.popularMeta}>{formatNumber(room.memberCount)} ÜYE</Text>
  </Pressable>
);

const ClubCard = ({
  room,
  joined,
  imageUri,
  onOpenRoom
}: {
  room: Room;
  joined: boolean;
  imageUri: string;
  onOpenRoom: (roomId: string) => void;
}) => (
  <Pressable onPress={() => onOpenRoom(room.id)} style={({ pressed }) => [styles.clubCard, pressed && styles.pressed]}>
    <Image source={{ uri: imageUri }} style={styles.clubImage} />
    <View style={styles.clubBody}>
      <View style={styles.clubTitleRow}>
        <View style={styles.clubTitleBlock}>
          <Text style={styles.clubTitle}>{room.modelName.toLocaleUpperCase('tr-TR')} KULÜBÜ</Text>
          <Text style={styles.clubDescription} numberOfLines={2}>{room.description.toLocaleUpperCase('tr-TR')}</Text>
        </View>
        <Text style={styles.clubTag}>{joined ? 'KATILDIN' : getVehicleCategory(room) === 'automobile' ? 'OTOMOBİL' : 'MOTOSİKLET'}</Text>
      </View>
      <View style={styles.clubFooter}>
        <View>
          <Text style={styles.metricLabel}>ÜYELER</Text>
          <Text style={styles.metricValue}>{formatNumber(room.memberCount)}</Text>
        </View>
        <View>
          <Text style={styles.metricLabel}>AKTİVİTE</Text>
          <Text style={styles.metricHot}>{room.ridersOnline > 80 ? 'YOĞUN' : 'AKTİF'}</Text>
        </View>
        <View style={styles.joinButton}>
          <Text style={styles.joinButtonText}>{joined ? 'AÇ' : 'KATIL'}</Text>
        </View>
      </View>
    </View>
  </Pressable>
);

const GroupListRow = ({
  room,
  index,
  onOpenRoom
}: {
  room: Room;
  index: number;
  onOpenRoom: (roomId: string) => void;
}) => {
  const latestMessage = room.messages[0];
  const unread = index === 0 ? 3 : 0;

  return (
    <Pressable onPress={() => onOpenRoom(room.id)} style={({ pressed }) => [styles.groupRow, index === 0 && styles.groupRowActive, pressed && styles.pressed]}>
      <View style={styles.groupIconFrame}>
        <Image source={{ uri: getRoomImage(room, index) }} style={styles.groupIconImage} />
      </View>
      <View style={styles.groupRowCopy}>
        <Text style={styles.groupRowTitle}>{room.modelName.toLocaleUpperCase('tr-TR')} SAHİPLERİ</Text>
        <Text style={styles.groupRowMessage} numberOfLines={1}>
          {(latestMessage?.authorName ?? 'MotoRoom')}: {(latestMessage?.body ?? room.description)}
        </Text>
      </View>
      <View style={styles.groupRowMeta}>
        <Text style={styles.groupTime}>{index === 0 ? '14:22' : index === 1 ? 'DÜN' : '10 EKİM'}</Text>
        {unread > 0 ? <Text style={styles.unreadBadge}>{unread}</Text> : null}
      </View>
    </Pressable>
  );
};

const MessageBlock = ({
  message,
  own,
  imageUri
}: {
  message: RoomMessage;
  own: boolean;
  imageUri?: string;
}) => (
  <View style={[styles.messageRow, own && styles.messageRowOwn]}>
    {!own ? <View style={styles.messageAvatar} /> : null}
    <View style={styles.messageColumn}>
      <Text style={[styles.messageAuthor, own && styles.messageAuthorOwn]}>
        {own ? 'SEN (MEKANİK_PİLOT)' : message.authorName.toLocaleUpperCase('tr-TR').replace(/\s+/g, '_')}
      </Text>
      <View style={[styles.messageBubble, own && styles.messageBubbleOwn]}>
        {imageUri ? <Image source={{ uri: imageUri }} style={styles.messageImage} /> : null}
        <Text style={[styles.messageText, own && styles.messageTextOwn]}>{message.body}</Text>
      </View>
    </View>
    {own ? <Image source={appLogo} style={styles.messageOwnAvatar} /> : null}
  </View>
);

const InsightStrip = ({ text }: { text: string }) => (
  <View style={styles.insightStrip}>
    <Ionicons name="trail-sign" size={20} color={theme.colors.success} />
    <Text style={styles.insightStripText}>{text.toLocaleUpperCase('tr-TR')}</Text>
  </View>
);

export default function MotoRoomApp() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [authBootstrapping, setAuthBootstrapping] = useState(true);
  const [catalog, setCatalog] = useState<CatalogData | null>(null);
  const [dataSource, setDataSource] = useState<DataSource>('mock');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AppTab>('discover');
  const [selectedCategory, setSelectedCategory] = useState<VehicleFilter>('all');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [joinedRoomIds, setJoinedRoomIds] = useState<string[]>(initialJoinedRooms);
  const [searchQuery, setSearchQuery] = useState('');
  const [draftMessage, setDraftMessage] = useState('');
  const [postingMessage, setPostingMessage] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authForm, setAuthForm] = useState<AuthFormState>(emptyAuthForm);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const chatScrollRef = useRef<ScrollView>(null);

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

  const rooms = catalog?.rooms ?? [];
  const selectedRoom = useMemo(() => rooms.find((room) => room.id === selectedRoomId) ?? null, [rooms, selectedRoomId]);
  const visibleChatMessages = useMemo(
    () => (selectedRoom ? [...selectedRoom.messages].reverse() : []),
    [selectedRoom]
  );

  const filteredRooms = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase('tr-TR');

    return rooms.filter((room) => {
      const category = getVehicleCategory(room);
      const matchesCategory = selectedCategory === 'all' || category === selectedCategory;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        room.modelName.toLocaleLowerCase('tr-TR').includes(normalizedQuery) ||
        room.brandId.toLocaleLowerCase('tr-TR').includes(normalizedQuery) ||
        room.tags.some((tag) => tag.toLocaleLowerCase('tr-TR').includes(normalizedQuery)) ||
        room.description.toLocaleLowerCase('tr-TR').includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [rooms, searchQuery, selectedCategory]);

  const joinedRooms = useMemo(
    () => rooms.filter((room) => joinedRoomIds.includes(room.id)),
    [rooms, joinedRoomIds]
  );

  const rideFeed = useMemo(
    () =>
      rooms.flatMap((room) =>
        room.meetups.map((event) => ({
          event,
          room
        }))
      ),
    [rooms]
  );

  const handleOpenRoom = (roomId: string) => {
    setSelectedRoomId(roomId);
    setActiveTab('rooms');
    setJoinedRoomIds((current) => (current.includes(roomId) ? current : [roomId, ...current]));
  };

  const handleTabChange = (tab: AppTab) => {
    setActiveTab(tab);
    if (tab !== 'rooms') {
      setSelectedRoomId(null);
    }
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

  const discoverScreen = (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.searchFrame}>
        <Ionicons name="search" size={20} color={theme.colors.subtle} />
        <TextInput
          placeholder="KULÜP, ARAÇ VEYA ETKİNLİK ARA..."
          placeholderTextColor={theme.colors.subtle}
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.filterRow}>
        <FilterButton label="TÜMÜ" selected={selectedCategory === 'all'} onPress={() => setSelectedCategory('all')} />
        <FilterButton
          label="OTOMOBİL"
          selected={selectedCategory === 'automobile'}
          onPress={() => setSelectedCategory('automobile')}
        />
        <FilterButton
          label="MOTOSİKLET"
          selected={selectedCategory === 'motorcycle'}
          onPress={() => setSelectedCategory('motorcycle')}
        />
      </View>

      <SectionTitle>POPÜLER GRUPLAR</SectionTitle>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.popularRail}>
        {rooms.slice(0, 4).map((room, index) => (
          <PopularCard key={room.id} room={room} imageUri={getRoomImage(room, index)} onOpenRoom={handleOpenRoom} />
        ))}
      </ScrollView>

      <SectionTitle>KULÜPLERİ KEŞFET</SectionTitle>
      {filteredRooms.length > 0 ? (
        filteredRooms.map((room, index) => (
          <ClubCard
            key={room.id}
            room={room}
            joined={joinedRoomIds.includes(room.id)}
            imageUri={getRoomImage(room, index + 2)}
            onOpenRoom={handleOpenRoom}
          />
        ))
      ) : (
        <View style={styles.emptyPanel}>
          <Text style={styles.emptyTitle}>KULÜP BULUNAMADI</Text>
          <Text style={styles.emptyBody}>ARAMAYI DEĞİŞTİR VEYA ARAÇ SINIFINI DEĞİŞTİR.</Text>
        </View>
      )}
    </ScrollView>
  );

  const groupsScreen = selectedRoom ? (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      style={styles.chatShell}
    >
      <View style={styles.chatHeader}>
        <Pressable onPress={() => setSelectedRoomId(null)} style={({ pressed }) => [styles.chatBack, pressed && styles.pressed]}>
          <Ionicons name="arrow-back" size={26} color={theme.colors.ink} />
        </Pressable>
        <Image source={{ uri: getRoomImage(selectedRoom) }} style={styles.chatGroupImage} />
        <View style={styles.chatTitleBlock}>
          <Text style={styles.chatTitle}>{selectedRoom.modelName.toLocaleUpperCase('tr-TR')} SAHİPLERİ</Text>
          <Text style={styles.chatSubtitle}>{selectedRoom.ridersOnline.toLocaleString('tr-TR')} AKTİF SÜRÜCÜ</Text>
        </View>
        <Ionicons name="search" size={25} color={theme.colors.ink} />
        <Ionicons name="ellipsis-vertical" size={24} color={theme.colors.ink} />
      </View>

      <ScrollView
        ref={chatScrollRef}
        contentContainerStyle={styles.chatContent}
        onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.datePill}>
          <Text style={styles.datePillText}>BUGÜN • 21:45</Text>
        </View>

        {visibleChatMessages.map((message, index) => (
          <View key={message.id}>
            <MessageBlock
              message={message}
              own={message.authorName === session?.user.displayName}
              imageUri={index === 1 ? getRoomImage(selectedRoom, 5) : undefined}
            />
            {index === 1 ? <InsightStrip text={`${selectedRoom.cityFocus} açık • 0 kaza`} /> : null}
          </View>
        ))}

      </ScrollView>

      <View style={styles.composerWrap}>
        <Pressable style={styles.composerIconButton}>
          <Ionicons name="add-circle" size={28} color={theme.colors.ink} />
        </Pressable>
        <TextInput
          multiline
          placeholder="MESAJ YAZ..."
          placeholderTextColor={theme.colors.subtle}
          style={styles.composerInput}
          value={draftMessage}
          onChangeText={setDraftMessage}
        />
        <Pressable style={styles.composerIconButton}>
          <Ionicons name="image" size={25} color={theme.colors.ink} />
        </Pressable>
        <Pressable
          onPress={handleSendMessage}
          style={({ pressed }) => [
            styles.sendButton,
            (postingMessage || draftMessage.trim().length === 0) && styles.sendButtonDisabled,
            pressed && styles.pressed
          ]}
        >
          {postingMessage ? <ActivityIndicator color={theme.colors.black} /> : <Ionicons name="send" size={26} color={theme.colors.black} />}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  ) : (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.screenHeading}>GRUPLARIM</Text>
      <View style={styles.searchFrameLarge}>
        <Ionicons name="search" size={24} color={theme.colors.subtle} />
        <Text style={styles.searchGhost}>KONU VEYA GRUP ARA...</Text>
      </View>

      {joinedRooms.map((room, index) => (
        <GroupListRow key={room.id} room={room} index={index} onOpenRoom={handleOpenRoom} />
      ))}

      <View style={styles.telemetryPanel}>
        <View style={styles.telemetryCell}>
          <Text style={styles.telemetryLabel}>AKTİF GRUPLAR</Text>
          <Text style={styles.telemetryNumber}>{joinedRooms.length + 12}</Text>
        </View>
        <View style={styles.telemetryCell}>
          <Text style={styles.telemetryLabel}>OKUNMAMIŞ MESAJ</Text>
          <View style={styles.unreadMetricRow}>
            <Text style={styles.telemetryNumberWhite}>3</Text>
            <View style={styles.unreadBarTrack}>
              <View style={styles.unreadBarFill} />
            </View>
          </View>
        </View>
        <View style={styles.latencyPanel}>
          <Text style={styles.telemetryLabel}>AĞ GECİKMESİ</Text>
          <View style={styles.barChart}>
            {[18, 32, 24, 46, 39, 54, 31, 62].map((height, index) => (
              <View key={`${height}-${index}`} style={[styles.barItem, { height }, index % 3 === 0 && styles.barItemDim]} />
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const createScreen = (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.screenHeading}>OLUŞTUR</Text>
      <View style={styles.emptyPanel}>
        <Ionicons name="add-circle" size={34} color={theme.colors.accent} />
        <Text style={styles.emptyTitle}>ÖZEL KULÜP MODÜLÜ</Text>
        <Text style={styles.emptyBody}>PREMIUM KULLANICILAR ÖZEL OTOMOBİL VEYA MOTOSİKLET GRUPLARI OLUŞTURABİLİR.</Text>
      </View>
      {rideFeed.slice(0, 4).map(({ event, room }) => (
        <RideCard key={event.id} event={event} room={room} onOpenRoom={handleOpenRoom} />
      ))}
    </ScrollView>
  );

  const garageScreen = (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.screenHeading}>GARAJ</Text>
      <View style={styles.garageCard}>
        <Image source={appLogo} style={styles.garageAvatar} />
        <Text style={styles.garageName}>{session?.user.displayName.toLocaleUpperCase('tr-TR')}</Text>
        <Text style={styles.garageMeta}>STANDART OPERATÖR • {session?.user.city.toLocaleUpperCase('tr-TR')}</Text>
        <View style={styles.garageGrid}>
          <View style={styles.garageStat}>
            <Text style={styles.metricLabel}>GRUP LİMİTİ</Text>
            <Text style={styles.metricValue}>4</Text>
          </View>
          <View style={styles.garageStat}>
            <Text style={styles.metricLabel}>BEKLEME</Text>
            <Text style={styles.metricValue}>24H</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const activeScreen =
    activeTab === 'discover'
      ? discoverScreen
      : activeTab === 'rooms'
        ? groupsScreen
        : activeTab === 'create'
          ? createScreen
          : garageScreen;

  if (authBootstrapping) {
    return (
      <View style={styles.loadingState}>
        <StatusBar style="light" />
        <ActivityIndicator color={theme.colors.accent} size="large" />
        <Text style={styles.loadingText}>MOTOROOM BAŞLATILIYOR...</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.appShell}>
        <StatusBar style="light" />
        <SafeAreaView style={styles.safeArea}>
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
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.appShell}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea}>
        {selectedRoom && activeTab === 'rooms' ? null : <AppHeader session={session} onSignOut={handleSignOut} />}

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={theme.colors.accent} size="large" />
            <Text style={styles.loadingText}>KULÜP LİSTESİ EŞİTLENİYOR...</Text>
          </View>
        ) : error ? (
          <View style={styles.loadingState}>
            <Text style={styles.errorTitle}>BAŞLATMA BAŞARISIZ</Text>
            <Text style={styles.errorBody}>{error}</Text>
          </View>
        ) : (
          <>
            <View style={styles.contentWrap}>{activeScreen}</View>
            {selectedRoom && activeTab === 'rooms' ? null : <BottomTabs activeTab={activeTab} onChange={handleTabChange} />}
          </>
        )}

        {dataSource === 'mock' && !selectedRoom ? (
          <View style={styles.sourceBadge}>
          <Text style={styles.sourceBadgeText}>ÖRNEK VERİ</Text>
          </View>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

const RideCard = ({
  event,
  room,
  onOpenRoom
}: {
  event: RideEvent;
  room: Room;
  onOpenRoom: (roomId: string) => void;
}) => (
  <Pressable onPress={() => onOpenRoom(room.id)} style={({ pressed }) => [styles.rideCard, pressed && styles.pressed]}>
    <View style={styles.rideAccent} />
    <View style={styles.rideCopy}>
      <Text style={styles.rideTitle}>{event.title.toLocaleUpperCase('tr-TR')}</Text>
      <Text style={styles.rideMeta}>{room.modelName.toLocaleUpperCase('tr-TR')} • {event.city.toLocaleUpperCase('tr-TR')} • {event.dateLabel.toLocaleUpperCase('tr-TR')}</Text>
    </View>
    <Text style={styles.rideCount}>{event.attendees}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  appShell: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  contentWrap: {
    flex: 1
  },
  headerBar: {
    minHeight: 70,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderColor: theme.colors.ink,
    marginRight: 14
  },
  headerCopy: {
    flex: 1
  },
  headerWordmark: {
    color: theme.colors.accent,
    fontSize: 24,
    fontStyle: 'italic',
    fontWeight: '900'
  },
  headerSubtitle: {
    color: theme.colors.subtle,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginTop: 3
  },
  headerIconButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center'
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 28
  },
  searchFrame: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceRaised,
    paddingHorizontal: 14,
    marginBottom: 12
  },
  searchFrameLarge: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceRaised,
    paddingHorizontal: 20,
    marginTop: 22,
    marginBottom: 28
  },
  searchInput: {
    flex: 1,
    color: theme.colors.ink,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.6,
    marginLeft: 10
  },
  searchGhost: {
    color: theme.colors.subtle,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2.4,
    marginLeft: 18
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 28
  },
  filterButton: {
    minHeight: 54,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background
  },
  filterButtonActive: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accent
  },
  filterText: {
    color: theme.colors.ink,
    fontSize: 12,
    fontWeight: '800'
  },
  filterTextActive: {
    color: theme.colors.black
  },
  sectionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 2
  },
  sectionRail: {
    width: 4,
    height: 22,
    backgroundColor: theme.colors.accent,
    marginRight: 8
  },
  sectionTitle: {
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: '900'
  },
  popularRail: {
    paddingBottom: 26,
    gap: 12
  },
  popularCard: {
    width: 220,
    height: 216,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    overflow: 'hidden'
  },
  popularImage: {
    width: '100%',
    height: 138,
    opacity: 0.88
  },
  popularShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)'
  },
  popularBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.black,
    marginTop: -12,
    marginLeft: 10,
    paddingHorizontal: 7,
    paddingVertical: 4
  },
  popularBadgeText: {
    color: theme.colors.accent,
    fontSize: 10,
    fontWeight: '900'
  },
  popularName: {
    color: theme.colors.ink,
    fontSize: 14,
    fontWeight: '900',
    marginHorizontal: 10,
    marginTop: 8
  },
  popularMeta: {
    color: theme.colors.muted,
    fontSize: 12,
    marginHorizontal: 10,
    marginTop: 6
  },
  clubCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    marginBottom: 16,
    overflow: 'hidden'
  },
  clubImage: {
    width: '100%',
    height: 190,
    opacity: 0.9
  },
  clubBody: {
    padding: 14
  },
  clubTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12
  },
  clubTitleBlock: {
    flex: 1
  },
  clubTitle: {
    color: theme.colors.ink,
    fontSize: 15,
    fontWeight: '900'
  },
  clubTag: {
    color: theme.colors.ink,
    fontSize: 8,
    fontWeight: '900',
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 7,
    paddingVertical: 4
  },
  clubDescription: {
    color: theme.colors.muted,
    fontSize: 11,
    lineHeight: 18,
    marginTop: 12
  },
  clubFooter: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#1E1F22',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between'
  },
  metricLabel: {
    color: theme.colors.muted,
    fontSize: 8,
    fontWeight: '900'
  },
  metricValue: {
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 4
  },
  metricHot: {
    color: theme.colors.success,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 4
  },
  joinButton: {
    width: 92,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent
  },
  joinButtonText: {
    color: theme.colors.black,
    fontSize: 11,
    fontWeight: '900'
  },
  screenHeading: {
    color: theme.colors.ink,
    fontSize: 27,
    fontWeight: '800',
    marginTop: 16
  },
  groupRow: {
    minHeight: 112,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 18
  },
  groupRowActive: {
    borderLeftWidth: 6,
    borderLeftColor: theme.colors.accent,
    backgroundColor: theme.colors.surface
  },
  groupIconFrame: {
    width: 66,
    height: 66,
    borderWidth: 1,
    borderColor: '#454850',
    padding: 3,
    marginRight: 18
  },
  groupIconImage: {
    flex: 1
  },
  groupRowCopy: {
    flex: 1
  },
  groupRowTitle: {
    color: theme.colors.ink,
    fontSize: 18,
    fontWeight: '900'
  },
  groupRowMessage: {
    color: theme.colors.muted,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8
  },
  groupRowMeta: {
    alignItems: 'flex-end',
    gap: 12
  },
  groupTime: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '900'
  },
  unreadBadge: {
    minWidth: 34,
    height: 34,
    textAlign: 'center',
    textAlignVertical: 'center',
    backgroundColor: theme.colors.accent,
    color: theme.colors.black,
    fontSize: 16,
    fontWeight: '900',
    paddingTop: Platform.OS === 'ios' ? 7 : 5
  },
  telemetryPanel: {
    marginTop: 34,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  telemetryCell: {
    width: '50%',
    minHeight: 112,
    padding: 20,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border
  },
  telemetryLabel: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2
  },
  telemetryNumber: {
    color: theme.colors.accent,
    fontSize: 34,
    fontWeight: '900',
    marginTop: 16
  },
  telemetryNumberWhite: {
    color: theme.colors.ink,
    fontSize: 34,
    fontWeight: '900'
  },
  unreadMetricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 16
  },
  unreadBarTrack: {
    flex: 1,
    height: 12,
    backgroundColor: '#202126'
  },
  unreadBarFill: {
    width: '34%',
    height: '100%',
    backgroundColor: theme.colors.accent
  },
  latencyPanel: {
    minHeight: 118,
    padding: 20,
    borderTopWidth: 0,
    borderColor: theme.colors.border
  },
  barChart: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    minHeight: 70
  },
  barItem: {
    flex: 1,
    backgroundColor: theme.colors.accent
  },
  barItemDim: {
    backgroundColor: '#7A2F17'
  },
  chatShell: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  chatHeader: {
    minHeight: 72,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface
  },
  chatBack: {
    width: 34,
    height: 34,
    justifyContent: 'center'
  },
  chatGroupImage: {
    width: 46,
    height: 46,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  chatTitleBlock: {
    flex: 1
  },
  chatTitle: {
    color: theme.colors.accent,
    fontSize: 16,
    fontWeight: '900'
  },
  chatSubtitle: {
    color: theme.colors.muted,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 4
  },
  chatContent: {
    paddingHorizontal: 14,
    paddingTop: 36,
    paddingBottom: 24
  },
  datePill: {
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderWarm,
    backgroundColor: theme.colors.panel,
    paddingHorizontal: 24,
    paddingVertical: 8,
    marginBottom: 32
  },
  datePillText: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 3
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 24
  },
  messageRowOwn: {
    justifyContent: 'flex-end'
  },
  messageAvatar: {
    width: 34,
    height: 34,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.panel,
    marginRight: 10
  },
  messageOwnAvatar: {
    width: 34,
    height: 34,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    marginLeft: 10
  },
  messageColumn: {
    maxWidth: '78%'
  },
  messageAuthor: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 8,
    marginLeft: 6
  },
  messageAuthorOwn: {
    color: theme.colors.accent,
    textAlign: 'right'
  },
  messageBubble: {
    borderWidth: 1,
    borderColor: theme.colors.borderWarm,
    backgroundColor: theme.colors.panel,
    padding: 16
  },
  messageBubbleOwn: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accent
  },
  messageText: {
    color: theme.colors.ink,
    fontSize: 20,
    lineHeight: 30
  },
  messageTextOwn: {
    color: theme.colors.black
  },
  messageImage: {
    width: 260,
    height: 150,
    marginBottom: 14
  },
  insightStrip: {
    minHeight: 56,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    marginBottom: 24
  },
  insightStripText: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    marginLeft: 14
  },
  typingText: {
    color: theme.colors.muted,
    fontSize: 12,
    fontStyle: 'italic',
    fontWeight: '900',
    letterSpacing: 2,
    marginLeft: 58,
    marginBottom: 12
  },
  composerWrap: {
    minHeight: 94,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10
  },
  composerIconButton: {
    width: 42,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center'
  },
  composerInput: {
    flex: 1,
    minHeight: 58,
    maxHeight: 110,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.subtle,
    backgroundColor: theme.colors.surfaceRaised,
    color: theme.colors.ink,
    fontSize: 18,
    paddingHorizontal: 14,
    paddingTop: 16
  },
  sendButton: {
    width: 60,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent
  },
  sendButtonDisabled: {
    opacity: 0.55
  },
  emptyPanel: {
    minHeight: 150,
    alignItems: 'flex-start',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 22,
    backgroundColor: theme.colors.surface
  },
  emptyTitle: {
    color: theme.colors.ink,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 12
  },
  emptyBody: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 20,
    fontWeight: '800',
    marginTop: 10
  },
  rideCard: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    marginTop: 14
  },
  rideAccent: {
    width: 5,
    alignSelf: 'stretch',
    backgroundColor: theme.colors.accent
  },
  rideCopy: {
    flex: 1,
    padding: 16
  },
  rideTitle: {
    color: theme.colors.ink,
    fontSize: 14,
    fontWeight: '900'
  },
  rideMeta: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 8
  },
  rideCount: {
    color: theme.colors.accent,
    fontSize: 24,
    fontWeight: '900',
    marginRight: 18
  },
  garageCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: 22,
    marginTop: 22
  },
  garageAvatar: {
    width: 72,
    height: 72,
    borderWidth: 1,
    borderColor: theme.colors.ink
  },
  garageName: {
    color: theme.colors.ink,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 18
  },
  garageMeta: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginTop: 8
  },
  garageGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 22
  },
  garageStat: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16
  },
  sourceBadge: {
    position: 'absolute',
    right: 12,
    bottom: 88,
    backgroundColor: theme.colors.panel,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  sourceBadgeText: {
    color: theme.colors.muted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
    padding: 24
  },
  loadingText: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 16
  },
  errorTitle: {
    color: theme.colors.accent,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 10
  },
  errorBody: {
    color: theme.colors.muted,
    fontSize: 14,
    textAlign: 'center'
  },
  pressed: {
    opacity: 0.74
  }
});
