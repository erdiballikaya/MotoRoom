import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AuthMode } from '../types';
import { theme } from '../theme';

const appLogo = require('../../assets/icon.png');

type AuthScreenProps = {
  mode: AuthMode;
  displayName: string;
  email: string;
  city: string;
  password: string;
  loading: boolean;
  error: string | null;
  onModeChange: (mode: AuthMode) => void;
  onFieldChange: (field: 'displayName' | 'email' | 'city' | 'password', value: string) => void;
  onSubmit: () => void;
};

const AuthTab = ({
  label,
  selected,
  onPress
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) => (
  <Pressable onPress={onPress} style={({ pressed }) => [styles.tabButton, selected && styles.tabButtonActive, pressed && styles.pressed]}>
    <Text style={[styles.tabButtonText, selected && styles.tabButtonTextActive]}>{label}</Text>
  </Pressable>
);

const AuthField = ({
  label,
  placeholder,
  value,
  secureTextEntry,
  keyboardType,
  onChangeText
}: {
  label: string;
  placeholder: string;
  value: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  onChangeText: (value: string) => void;
}) => (
  <View style={styles.fieldWrap}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
      autoCorrect={false}
      keyboardType={keyboardType}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#8A7D70"
      secureTextEntry={secureTextEntry}
      style={styles.fieldInput}
      value={value}
    />
  </View>
);

export const AuthScreen = ({
  mode,
  displayName,
  email,
  city,
  password,
  loading,
  error,
  onModeChange,
  onFieldChange,
  onSubmit
}: AuthScreenProps) => {
  const registerMode = mode === 'register';

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.heroCard}>
        <View style={styles.heroOrbLarge} />
        <View style={styles.heroOrbSmall} />
        <View style={styles.logoWrap}>
          <Image source={appLogo} style={styles.logoImage} />
        </View>
        <Text style={styles.eyebrow}>MotoRoom Membership</Text>
        <Text style={styles.heroTitle}>Önce giriş yap, sonra model odalarına geç.</Text>
        <Text style={styles.heroBody}>
          Kayıtlı üyeler sohbet geçmişini görür, sorular sorar ve yaz buluşmalarına katılır.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.tabRow}>
          <AuthTab label="Giriş yap" onPress={() => onModeChange('login')} selected={!registerMode} />
          <AuthTab label="Kayıt ol" onPress={() => onModeChange('register')} selected={registerMode} />
        </View>

        {registerMode ? (
          <>
            <AuthField
              label="Ad soyad"
              placeholder="Adını gir"
              value={displayName}
              onChangeText={(value) => onFieldChange('displayName', value)}
            />
            <AuthField
              label="Şehir"
              placeholder="Örn. Kadıköy"
              value={city}
              onChangeText={(value) => onFieldChange('city', value)}
            />
          </>
        ) : null}

        <AuthField
          keyboardType="email-address"
          label="E-posta"
          placeholder="ornek@mail.com"
          value={email}
          onChangeText={(value) => onFieldChange('email', value)}
        />
        <AuthField
          label="Şifre"
          placeholder="En az 6 karakter"
          secureTextEntry
          value={password}
          onChangeText={(value) => onFieldChange('password', value)}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable onPress={onSubmit} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, loading && styles.buttonDisabled]}>
          {loading ? (
            <ActivityIndicator color={theme.colors.card} />
          ) : (
            <Text style={styles.primaryButtonText}>{registerMode ? 'Hesap oluştur' : 'Giriş yap'}</Text>
          )}
        </Pressable>

        <View style={styles.noticeBox}>
          <Ionicons name="information-circle-outline" size={18} color={theme.colors.ink} />
          <Text style={styles.noticeText}>Bu TestFlight yapısında sosyal giriş geçici olarak kapatıldı.</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 22,
    paddingBottom: 40
  },
  heroCard: {
    backgroundColor: '#22160E',
    borderRadius: theme.radius.lg,
    padding: 22,
    overflow: 'hidden',
    marginBottom: 18
  },
  heroOrbLarge: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 190,
    top: -40,
    right: -50,
    backgroundColor: '#F26A1B'
  },
  heroOrbSmall: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 110,
    bottom: -32,
    right: 88,
    backgroundColor: '#135D52'
  },
  logoWrap: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  logoImage: {
    width: 46,
    height: 46,
    borderRadius: 14
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
    lineHeight: 22,
    marginTop: 14,
    maxWidth: '82%'
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 20
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.pill,
    padding: 4,
    marginBottom: 20
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: theme.radius.pill,
    alignItems: 'center'
  },
  tabButtonActive: {
    backgroundColor: theme.colors.overlay
  },
  tabButtonText: {
    color: theme.colors.muted,
    fontSize: 14,
    fontWeight: '800'
  },
  tabButtonTextActive: {
    color: theme.colors.card
  },
  fieldWrap: {
    marginBottom: 14
  },
  fieldLabel: {
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8
  },
  fieldInput: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 16,
    paddingVertical: 15,
    color: theme.colors.ink,
    fontSize: 15
  },
  errorText: {
    color: '#B3261E',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12
  },
  primaryButton: {
    height: 54,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.accentDeep,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6
  },
  primaryButtonText: {
    color: theme.colors.card,
    fontSize: 15,
    fontWeight: '900'
  },
  noticeBox: {
    marginTop: 18,
    minHeight: 54,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 14,
    gap: 8
  },
  noticeText: {
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: '700'
  },
  buttonDisabled: {
    opacity: 0.45
  },
  pressed: {
    opacity: 0.86
  }
});
