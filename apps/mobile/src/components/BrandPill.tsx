import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme';

type BrandPillProps = {
  accent: string;
  id: string;
  name: string;
  selected: boolean;
  subtitle: string;
  onPress: (brandId: string) => void;
};

export const BrandPill = ({
  accent,
  id,
  name,
  selected,
  subtitle,
  onPress
}: BrandPillProps) => (
  <Pressable
    accessibilityRole="button"
    onPress={() => onPress(id)}
    style={({ pressed }) => [
      styles.container,
      selected && styles.containerSelected,
      { borderColor: selected ? accent : theme.colors.border },
      pressed && styles.containerPressed
    ]}
  >
    <View style={[styles.dot, { backgroundColor: accent }]} />
    <View style={styles.copy}>
      <Text style={styles.title}>{name}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  container: {
    width: 168,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    backgroundColor: theme.colors.card,
    marginRight: 12
  },
  containerPressed: {
    transform: [{ scale: 0.98 }]
  },
  containerSelected: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    marginRight: 12
  },
  copy: {
    flex: 1
  },
  title: {
    color: theme.colors.ink,
    fontSize: 16,
    fontWeight: '800'
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: 12,
    marginTop: 4
  }
});
