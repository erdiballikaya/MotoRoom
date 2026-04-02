import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '../theme';
import { Room } from '../types';

type RoomCardProps = {
  accent: string;
  joined: boolean;
  room: Room;
  onPress: (roomId: string) => void;
};

export const RoomCard = ({ accent, joined, room, onPress }: RoomCardProps) => (
  <Pressable
    accessibilityRole="button"
    onPress={() => onPress(room.id)}
    style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
  >
    <View style={[styles.accentBar, { backgroundColor: accent }]} />
    <View style={styles.headerRow}>
      <View style={styles.titleWrap}>
        <Text style={styles.title}>{room.modelName}</Text>
        <Text style={styles.subtitle}>
          {room.segment} · {room.engine}
        </Text>
      </View>
      <View style={[styles.joinedBadge, joined && styles.joinedBadgeActive]}>
        <Text style={[styles.joinedText, joined && styles.joinedTextActive]}>
          {joined ? 'Katıldın' : 'Odaya gir'}
        </Text>
      </View>
    </View>

    <Text style={styles.description}>{room.description}</Text>

    <View style={styles.statsRow}>
      <View style={styles.statItem}>
        <Ionicons name="flash-outline" size={15} color={theme.colors.accentDeep} />
        <Text style={styles.statText}>{room.ridersOnline} aktif</Text>
      </View>
      <View style={styles.statItem}>
        <Ionicons name="chatbox-ellipses-outline" size={15} color={theme.colors.info} />
        <Text style={styles.statText}>{room.archivedMessageCount.toLocaleString('tr-TR')} mesaj</Text>
      </View>
      <View style={styles.statItem}>
        <Ionicons name="location-outline" size={15} color={theme.colors.success} />
        <Text style={styles.statText}>{room.cityFocus}</Text>
      </View>
    </View>

    <View style={styles.tagsRow}>
      {room.tags.map((tag) => (
        <View key={tag} style={styles.tag}>
          <Text style={styles.tagText}>#{tag}</Text>
        </View>
      ))}
    </View>

    <Text style={styles.seasonNote}>{room.seasonNote}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
    overflow: 'hidden'
  },
  cardPressed: {
    transform: [{ scale: 0.99 }]
  },
  accentBar: {
    height: 6,
    marginHorizontal: -22,
    marginTop: -22,
    marginBottom: 18
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between'
  },
  titleWrap: {
    flex: 1,
    paddingRight: 12
  },
  title: {
    color: theme.colors.ink,
    fontSize: 21,
    fontWeight: '900'
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: 13,
    marginTop: 4
  },
  joinedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface
  },
  joinedBadgeActive: {
    backgroundColor: theme.colors.chip
  },
  joinedText: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '700'
  },
  joinedTextActive: {
    color: theme.colors.chipText
  },
  description: {
    color: theme.colors.ink,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 16
  },
  statsRow: {
    marginTop: 16,
    gap: 10
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statText: {
    color: theme.colors.muted,
    fontSize: 13,
    marginLeft: 8
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    marginBottom: 14
  },
  tag: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8
  },
  tagText: {
    color: theme.colors.chipText,
    fontSize: 12,
    fontWeight: '700'
  },
  seasonNote: {
    color: theme.colors.accentDeep,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700'
  }
});
