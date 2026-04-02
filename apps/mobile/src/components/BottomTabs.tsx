import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '../theme';

export type AppTab = 'discover' | 'rooms' | 'rides';

type BottomTabsProps = {
  activeTab: AppTab;
  onChange: (tab: AppTab) => void;
};

const tabs: { key: AppTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'discover', label: 'Keşfet', icon: 'compass-outline' },
  { key: 'rooms', label: 'Odalarım', icon: 'chatbubbles-outline' },
  { key: 'rides', label: 'Buluşmalar', icon: 'map-outline' }
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
          style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
        >
          <Ionicons
            name={tab.icon}
            size={20}
            color={selected ? theme.colors.accentDeep : theme.colors.tabIdle}
          />
          <Text style={[styles.label, selected && styles.labelSelected]}>{tab.label}</Text>
        </Pressable>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#24170F',
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 18,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 88
  },
  tabPressed: {
    opacity: 0.82
  },
  label: {
    color: theme.colors.tabIdle,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6
  },
  labelSelected: {
    color: theme.colors.accent
  }
});
