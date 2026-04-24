import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '../theme';

export type AppTab = 'discover' | 'rooms' | 'create' | 'garage';

type BottomTabsProps = {
  activeTab: AppTab;
  onChange: (tab: AppTab) => void;
};

const tabs: { key: AppTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'discover', label: 'KEŞFET', icon: 'navigate-circle' },
  { key: 'rooms', label: 'GRUPLAR', icon: 'people' },
  { key: 'create', label: 'OLUŞTUR', icon: 'add-circle' },
  { key: 'garage', label: 'GARAJ', icon: 'car-sport' }
];

export const BottomTabs = ({ activeTab, onChange }: BottomTabsProps) => (
  <View style={styles.container}>
    {tabs.map((tab) => {
      const selected = tab.key === activeTab;

      return (
        <Pressable
          key={tab.key}
          accessibilityRole="button"
          onPress={() => onChange(tab.key)}
          style={({ pressed }) => [styles.tab, selected && styles.tabSelected, pressed && styles.tabPressed]}
        >
          <Ionicons name={tab.icon} size={22} color={selected ? theme.colors.accent : theme.colors.tabIdle} />
          <Text style={[styles.label, selected && styles.labelSelected]}>{tab.label}</Text>
        </Pressable>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  container: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'stretch',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 4,
    borderTopColor: 'transparent'
  },
  tabSelected: {
    borderTopColor: theme.colors.accent,
    backgroundColor: '#18191B'
  },
  tabPressed: {
    opacity: 0.72
  },
  label: {
    marginTop: 7,
    color: theme.colors.tabIdle,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5
  },
  labelSelected: {
    color: theme.colors.accent
  }
});
