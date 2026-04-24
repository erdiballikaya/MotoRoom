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

const AuthField = ({
  icon,
  label,
  placeholder,
  value,
  secureTextEntry,
  keyboardType,
  onChangeText
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  placeholder: string;
  value: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  onChangeText: (value: string) => void;
}) => (
  <View style={styles.fieldWrap}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={styles.fieldFrame}>
      <Ionicons name={icon} size={24} color={theme.colors.accentSoft} />
      <TextInput
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
        autoCorrect={false}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.subtle}
        secureTextEntry={secureTextEntry}
        style={styles.fieldInput}
        value={value}
      />
      {secureTextEntry ? <Ionicons name="eye" size={24} color={theme.colors.accentSoft} /> : null}
    </View>
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
      <View style={styles.wordmarkBlock}>
        <Image source={appLogo} style={styles.logoImage} />
        <Text style={styles.wordmark}>MOTOROOM</Text>
        <Text style={styles.tagline}>HASSASİYET. HIZ. TOPLULUK.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{registerMode ? 'FİLOYA KATIL' : 'TEKRAR HOŞ GELDİN'}</Text>
        <View style={styles.titleRule} />

        {registerMode ? (
          <>
            <AuthField
              icon="person"
              label="SÜRÜCÜ ADI"
              placeholder="AD SOYAD"
              value={displayName}
              onChangeText={(value) => onFieldChange('displayName', value)}
            />
            <AuthField
              icon="location"
              label="ANA GARAJ"
              placeholder="ŞEHİR"
              value={city}
              onChangeText={(value) => onFieldChange('city', value)}
            />
          </>
        ) : null}

        <AuthField
          icon="at"
          keyboardType="email-address"
          label="OPERATÖR ID / E-POSTA"
          placeholder="AD@ALANADI.COM"
          value={email}
          onChangeText={(value) => onFieldChange('email', value)}
        />
        <AuthField
          icon="lock-closed"
          label="GÜVENLİK ANAHTARI"
          placeholder="••••••••"
          secureTextEntry
          value={password}
          onChangeText={(value) => onFieldChange('password', value)}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          disabled={loading}
          onPress={onSubmit}
          style={({ pressed }) => [styles.primaryButton, loading && styles.buttonDisabled, pressed && styles.pressed]}
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.black} />
          ) : (
            <Text style={styles.primaryButtonText}>{registerMode ? 'GARAJ OLUŞTUR' : 'GİRİŞİ BAŞLAT'}</Text>
          )}
        </Pressable>

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>DIŞ HESAP</Text>
          <View style={styles.divider} />
        </View>

        <View style={styles.externalRow}>
          <View style={styles.externalButton}>
            <Ionicons name="logo-google" size={24} color={theme.colors.ink} />
            <Text style={styles.externalText}>GOOGLE</Text>
          </View>
          <View style={styles.externalButton}>
            <Ionicons name="logo-apple" size={26} color={theme.colors.ink} />
            <Text style={styles.externalText}>APPLE</Text>
          </View>
        </View>
      </View>

      <View style={styles.modeSwitch}>
        <Text style={styles.modeCopy}>{registerMode ? 'Garajda hesabın var mı?' : 'Garaja yeni mi geldin?'}</Text>
        <Pressable onPress={() => onModeChange(registerMode ? 'login' : 'register')} style={styles.modeLink}>
          <Text style={styles.modeLinkText}>{registerMode ? 'GİRİŞİ BAŞLAT' : 'FİLOYA KATIL'}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    minHeight: '100%',
    paddingHorizontal: 20,
    paddingTop: 88,
    paddingBottom: 42,
    backgroundColor: theme.colors.background
  },
  wordmarkBlock: {
    alignItems: 'center',
    marginBottom: 44
  },
  logoImage: {
    width: 40,
    height: 40,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  wordmark: {
    color: theme.colors.accent,
    fontSize: 42,
    lineHeight: 48,
    fontStyle: 'italic',
    fontWeight: '900'
  },
  tagline: {
    marginTop: 8,
    color: '#E2BDB4',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 4
  },
  card: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: 'rgba(24, 24, 25, 0.94)',
    padding: 18
  },
  cardTitle: {
    color: theme.colors.ink,
    fontSize: 26,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  titleRule: {
    width: 84,
    height: 6,
    marginTop: 14,
    marginBottom: 30,
    backgroundColor: theme.colors.accent
  },
  fieldWrap: {
    marginBottom: 22
  },
  fieldLabel: {
    color: '#E1BDB4',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 10
  },
  fieldFrame: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.field,
    paddingHorizontal: 16
  },
  fieldInput: {
    flex: 1,
    marginHorizontal: 16,
    color: theme.colors.ink,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.6
  },
  errorText: {
    color: '#FF9B82',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    marginBottom: 14
  },
  primaryButton: {
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
    marginTop: 8
  },
  primaryButtonText: {
    color: theme.colors.black,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 4
  },
  buttonDisabled: {
    opacity: 0.55
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 38,
    marginBottom: 28
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.borderWarm
  },
  dividerText: {
    color: theme.colors.accentSoft,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 3,
    marginHorizontal: 18
  },
  externalRow: {
    flexDirection: 'row',
    gap: 14
  },
  externalButton: {
    flex: 1,
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#292A2C'
  },
  externalText: {
    color: theme.colors.ink,
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '900'
  },
  modeSwitch: {
    marginTop: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  modeCopy: {
    color: '#E2BDB4',
    fontSize: 20,
    marginRight: 12
  },
  modeLink: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.accent
  },
  modeLinkText: {
    color: theme.colors.accent,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1.5
  },
  pressed: {
    opacity: 0.76
  }
});
