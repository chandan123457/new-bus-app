import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { userAPI } from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const formatDate = (value) => {
  if (!value) {
    return '—';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }
  return parsed.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const formatCurrency = (amount = 0) => {
  const safeAmount = Number(amount) || 0;
  return `₹${safeAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

const ProfileScreen = ({ navigation }) => {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ totalBookings: 0, totalSpent: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedPhone, setEditedPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchUserProfile = useCallback(async () => {
    setError(null);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const cachedUser = await AsyncStorage.getItem('userData');

      if (cachedUser) {
        try {
          const parsed = JSON.parse(cachedUser);
          setProfile(parsed);
        } catch (parseError) {
          console.warn('Failed to parse cached user data:', parseError);
        }
      }

      if (!token) {
        setLoading(false);
        setError('Please sign in to view your profile.');
        navigation.navigate('SignIn');
        return;
      }

      const result = await userAPI.getProfile(token);

      if (result.success) {
        setProfile(result.data.user);
        setEditedName(result.data.user?.name || '');
        setEditedPhone(result.data.user?.phone || '');
        setStats({
          totalBookings: result.data.statistics?.totalBookings || 0,
          totalSpent: result.data.statistics?.totalSpent || 0,
        });
        await AsyncStorage.setItem('userData', JSON.stringify(result.data.user));
      } else {
        setError(result.error || 'Unable to load profile right now.');
      }
    } catch (fetchError) {
      console.error('Profile fetch error:', fetchError);
      setError('Unable to load profile right now.');
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      fetchUserProfile();
    }, [fetchUserProfile])
  );

  const handleNotifications = () => {
    navigation.navigate('Notifications');
  };

  const handleLogout = useCallback(() => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Stay Logged In', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.multiRemove(['authToken', 'userData']);
          navigation.reset({ index: 0, routes: [{ name: 'SignIn' }] });
        },
      },
    ]);
  }, [navigation]);

  const handleEditToggle = () => {
    if (isEditing) {
      setEditedName(profile?.name || '');
      setEditedPhone(profile?.phone || '');
    }
    setIsEditing(!isEditing);
  };

  const handleSaveProfile = async () => {
    if (!editedName.trim()) {
      Alert.alert('Invalid Input', 'Name cannot be empty');
      return;
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('Error', 'Please sign in again');
        return;
      }

      const updateData = {
        name: editedName.trim(),
        phone: editedPhone.trim() || undefined,
      };

      const result = await userAPI.updateProfile(updateData, token);

      if (result.success) {
        setProfile(result.data.user);
        await AsyncStorage.setItem('userData', JSON.stringify(result.data.user));
        setIsEditing(false);
        Alert.alert('Success', 'Profile updated successfully');
      } else {
        throw new Error(result.error || 'Failed to update profile');
      }
    } catch (err) {
      Alert.alert('Update Failed', err.message || 'Unable to update profile');
    } finally {
      setSaving(false);
    }
  };

  const travelerName = profile?.name || 'Traveler';
  const isVerified = Boolean(profile?.verified);
  const verificationLabel = isVerified ? 'Verified' : 'Pending';
  const verificationIcon = isVerified ? 'check-decagram' : 'shield-alert';

  const accountDetails = [
    {
      id: 'name',
      label: 'Full Name',
      value: travelerName,
      icon: 'account-outline',
      editable: true,
    },
    {
      id: 'email',
      label: 'Email Address',
      value: profile?.email || 'Add your email address',
      icon: 'email-check-outline',
      editable: false,
    },
    {
      id: 'phone',
      label: 'Phone Number',
      value: profile?.phone || 'Add your phone number',
      icon: 'phone-outline',
      editable: true,
    },
    {
      id: 'memberSince',
      label: 'Member Since',
      value: formatDate(profile?.createdAt),
      icon: 'calendar-month-outline',
      editable: false,
    },
  ];

  const quickActions = [
    {
      id: 'bookings',
      label: 'View Bookings',
      icon: 'ticket-confirmation-outline',
      onPress: () => navigation.navigate('Bookings'),
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: 'bell-outline',
      onPress: handleNotifications,
    },
    {
      id: 'logout',
      label: 'Logout',
      icon: 'logout',
      onPress: handleLogout,
      destructive: true,
    },
  ];

  const renderAccountDetail = (detail) => {
    const isNameField = detail.id === 'name';
    const isPhoneField = detail.id === 'phone';
    const showInput = isEditing && detail.editable;

    return (
      <View key={detail.id} style={styles.infoRow}>
        <View style={styles.infoLabelGroup}>
          <MaterialCommunityIcons name={detail.icon} size={20} color="#6366F1" />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoLabel}>{detail.label}</Text>
            {showInput ? (
              <TextInput
                style={styles.infoInput}
                value={isNameField ? editedName : isPhoneField ? editedPhone : detail.value}
                onChangeText={(text) => {
                  if (isNameField) setEditedName(text);
                  else if (isPhoneField) setEditedPhone(text);
                }}
                placeholder={detail.label}
                keyboardType={isPhoneField ? 'phone-pad' : 'default'}
                editable={!saving}
              />
            ) : (
              <Text
                style={styles.infoValue}
                numberOfLines={detail.id === 'email' ? 1 : undefined}
                ellipsizeMode={detail.id === 'email' ? 'tail' : undefined}
              >
                {detail.value}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderQuickAction = (action) => (
    <TouchableOpacity
      key={action.id}
      style={styles.quickActionRow}
      onPress={action.onPress}
      activeOpacity={0.8}
    >
      <View style={styles.quickActionLeft}>
        <View
          style={[
            styles.quickActionIcon,
            action.destructive && styles.quickActionIconDanger,
          ]}
        >
          <MaterialCommunityIcons
            name={action.icon}
            size={18}
            color={action.destructive ? '#FFFFFF' : '#4F46E5'}
          />
        </View>
        <Text
          style={[
            styles.quickActionText,
            action.destructive && styles.quickActionDangerText,
          ]}
        >
          {action.label}
        </Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color="#94A3B8" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <ImageBackground
          source={require('../../assets/landing-background.jpg')}
          style={styles.heroBackground}
          resizeMode="cover"
        >
          <View style={styles.heroOverlay} />
          <SafeAreaView edges={['top']} style={styles.heroInner}>
            <Text style={styles.heroTitle}>My Profile</Text>
            <Text style={styles.heroSubtitle}>Manage your account information</Text>
          </SafeAreaView>
        </ImageBackground>

        <View style={styles.mainCard}>
          {error && (
            <View style={styles.errorBanner}>
              <MaterialCommunityIcons name="alert-circle" size={20} color="#B91C1C" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={fetchUserProfile} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {loading && !profile ? (
            <View style={styles.loaderWrapper}>
              <ActivityIndicator size="small" color="#4F46E5" />
              <Text style={styles.loaderText}>Fetching profile...</Text>
            </View>
          ) : (
            <>
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Account Information</Text>
                  {!isEditing ? (
                    <TouchableOpacity style={styles.editLink} onPress={handleEditToggle} activeOpacity={0.7}>
                      <MaterialCommunityIcons name="pencil-outline" size={16} color="#6366F1" />
                      <Text style={styles.editText}>Edit</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.editActions}>
                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={handleEditToggle}
                        activeOpacity={0.7}
                        disabled={saving}
                      >
                        <Text style={styles.cancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                        onPress={handleSaveProfile}
                        activeOpacity={0.7}
                        disabled={saving}
                      >
                        {saving ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.saveText}>Save</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                <View style={styles.infoGrid}>{accountDetails.map(renderAccountDetail)}</View>
              </View>

              <View style={styles.cardGrid}>
                <View style={[styles.card, styles.quickActionsCard]}>
                  <Text style={styles.cardTitle}>Quick Actions</Text>
                  <View style={styles.quickActionDivider} />
                  {quickActions.map(renderQuickAction)}
                </View>

                <View style={[styles.card, styles.statusCard]}>
                  <Text style={[styles.cardTitle, styles.statusCardTitle]}>Account Status</Text>
                  <View style={styles.statusBadge}>
                    <MaterialCommunityIcons
                      name={verificationIcon}
                      size={18}
                      color="#FFFFFF"
                    />
                    <Text style={styles.statusBadgeText}>{verificationLabel}</Text>
                  </View>
                  <View style={styles.statusMetaRow}>
                    <Text style={styles.statusLabel}>Account Type</Text>
                    <Text style={styles.statusValue}>Traveler</Text>
                  </View>
                  <View style={styles.statusMetaRow}>
                    <Text style={styles.statusLabel}>Member Since</Text>
                    <Text style={styles.statusValue}>{formatDate(profile?.createdAt)}</Text>
                  </View>
                  <View style={styles.statsRow}>
                    <View style={styles.statsChip}>
                      <Text style={styles.statsChipNumber}>{stats.totalBookings}</Text>
                      <Text style={styles.statsChipLabel}>Total Bookings</Text>
                    </View>
                    <View style={styles.statsChip}>
                      <Text style={styles.statsChipNumber}>{formatCurrency(stats.totalSpent)}</Text>
                      <Text style={styles.statsChipLabel}>Total Spent</Text>
                    </View>
                  </View>
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7F9',
  },
  heroBackground: {
    height: 160,
    width: SCREEN_WIDTH,
    paddingBottom: 20,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(44, 95, 111, 0.80)',
  },
  heroInner: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  heroBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  brandTagline: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    marginTop: 18,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    marginTop: 6,
    fontSize: 14,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  mainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12,
    marginHorizontal: 18,
    marginTop: -25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    gap: 16,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 16,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    flex: 1,
    color: '#7F1D1D',
    fontSize: 13,
  },
  retryButton: {
    backgroundColor: '#B91C1C',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  statusCardTitle: {
    color: '#FFFFFF',
  },
  editLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editText: {
    color: '#6366F1',
    fontWeight: '600',
  },
  editActions: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 8,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
    backgroundColor: '#F1F5F9',
  },
  cancelText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '700',
  },
  saveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
    backgroundColor: '#6366F1',
    minWidth: 80,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  infoInput: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 4,
    backgroundColor: '#FFFFFF',
  },
  infoGrid: {
    gap: 16,
  },
  infoRow: {
    paddingVertical: 4,
  },
  infoLabelGroup: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  infoLabel: {
    color: '#94A3B8',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  infoValue: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '600',
  },
  cardGrid: {
    flexDirection: SCREEN_WIDTH > 700 ? 'row' : 'column',
    gap: 16,
  },
  quickActionsCard: {
    flex: 1,
  },
  quickActionDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  quickActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  quickActionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionIconDanger: {
    backgroundColor: '#FCA5A5',
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  quickActionDangerText: {
    color: '#B91C1C',
  },
  statusCard: {
    flex: SCREEN_WIDTH > 700 ? 0.8 : 1,
    backgroundColor: '#1E1B4B',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#4338CA',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginVertical: 12,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  statusMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  statusLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
  },
  statusValue: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
    gap: 12,
  },
  statsChip: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    padding: 12,
    borderRadius: 16,
  },
  statsChipNumber: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  statsChipLabel: {
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    fontSize: 12,
  },
  loaderWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 32,
  },
  loaderText: {
    color: '#475569',
  },
});

export default ProfileScreen;
