import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '../theme';
import { RoomMessage } from '../types';

type MessageBubbleProps = {
  message: RoomMessage;
};

export const MessageBubble = ({ message }: MessageBubbleProps) => (
  <View style={[styles.card, message.pinned && styles.cardPinned]}>
    <View style={styles.headerRow}>
      <View style={styles.authorWrap}>
        <Text style={styles.author}>{message.authorName}</Text>
        <Text style={styles.meta}>
          {message.role} · {message.city}
        </Text>
      </View>
      <Text style={styles.time}>{message.relativeTime}</Text>
    </View>

    <Text style={styles.body}>{message.body}</Text>

    <View style={styles.footerRow}>
      {message.pinned ? (
        <View style={styles.badge}>
          <Ionicons name="pin" size={12} color={theme.colors.accentDeep} />
          <Text style={styles.badgeText}>öne çıktı</Text>
        </View>
      ) : (
        <View />
      )}

      <View style={styles.helpfulWrap}>
        <Ionicons name="thumbs-up-outline" size={14} color={theme.colors.muted} />
        <Text style={styles.helpfulText}>{message.helpfulCount}</Text>
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    marginBottom: 12
  },
  cardPinned: {
    borderColor: '#F2B488',
    backgroundColor: '#FFF4E9'
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  authorWrap: {
    flex: 1,
    paddingRight: 12
  },
  author: {
    color: theme.colors.ink,
    fontSize: 15,
    fontWeight: '800'
  },
  meta: {
    color: theme.colors.muted,
    fontSize: 12,
    marginTop: 4
  },
  time: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '600'
  },
  body: {
    color: theme.colors.ink,
    fontSize: 15,
    lineHeight: 23,
    marginTop: 14
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  badgeText: {
    color: theme.colors.accentDeep,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6
  },
  helpfulWrap: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  helpfulText: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6
  }
});
