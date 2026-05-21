import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { userAPI } from '../services/api';

const typeStyles = {
  BOOKING_CONFIRMED: {
    bg: '#ECFDF3',
    border: '#BBF7D0',
    icon: 'check-circle',
    iconColor: '#16A34A',
  },
  BOOKING_CANCELLED: {
    bg: '#FEF2F2',
    border: '#FECACA',
    icon: 'close-circle',
    iconColor: '#DC2626',
  },
  TRIP_CANCELLED: {
    bg: '#FEF2F2',
    border: '#FECACA',
    icon: 'alert-circle',
    iconColor: '#DC2626',
  },
  TRIP_REMINDER: {
    bg: '#EFF6FF',
    border: '#BFDBFE',
    icon: 'clock-outline',
    iconColor: '#2563EB',
  },
  OFFER_APPLIED: {
    bg: '#F5F3FF',
    border: '#DDD6FE',
    icon: 'tag-outline',
    iconColor: '#7C3AED',
  },
  GENERAL: {
    bg: '#F8FAFC',
    border: '#E2E8F0',
    icon: 'information-outline',
    iconColor: '#0EA5E9',
  },
};

const formatTimestamp = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const NotificationCard = ({ notification, onMarkRead }) => {
  const style = typeStyles[notification.type] || typeStyles.GENERAL;
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: style.bg, borderColor: style.border },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <MaterialCommunityIcons
            name={style.icon}
            size={20}
            color={style.iconColor}
            style={{ marginRight: 6 }}
          />
          <Text style={styles.cardTitle}>{notification.title}</Text>
        </View>
        {!notification.isRead && (
          <TouchableOpacity
            onPress={() => onMarkRead(notification.id)}
            activeOpacity={0.7}
            style={styles.markReadBtn}
          >
            <Text style={styles.markReadText}>Mark as read</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.cardMessage}>{notification.message}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.cardMeta}>{formatTimestamp(notification.createdAt)}</Text>
        {notification.isRead ? (
          <View style={styles.readPill}>
            <MaterialCommunityIcons name="check" size={14} color="#0EA5E9" />
            <Text style={styles.readPillText}>Read</Text>
          </View>
        ) : (
          <View style={styles.unreadPill}>
            <Text style={styles.unreadPillText}>Unread</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const NotificationsScreen = ({ navigation }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        setError('Please sign in to view notifications.');
        return;
      }

      const response = await userAPI.getNotifications(token, { unreadOnly: false, limit: 50 });
      if (response.success) {
        setNotifications(response.data.notifications || []);
        setUnreadCount(response.data.unreadCount || 0);
      } else {
        setError(response.error || 'Unable to fetch notifications.');
      }
    } catch (err) {
      setError(err.message || 'Unable to fetch notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications])
  );

  const handleMarkRead = async (id) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;
      await userAPI.markNotificationAsRead(id, token);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (err) {
      console.warn('Failed to mark notification as read', err.message);
    }
  };

  const handleMarkAll = async () => {
    try {
      setMarkingAll(true);
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;
      const res = await userAPI.markAllNotificationsRead(token);
      if (res.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.warn('Failed to mark all notifications', err.message);
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Header with background image */}
      <View style={styles.headerSection}>
        <ImageBackground
          source={require('../../assets/landing-background.jpg')}
          style={styles.backgroundImage}
          resizeMode="cover"
        >
          <View style={styles.overlay} />
          <SafeAreaView edges={['top']} style={styles.safeArea}>
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
                <MaterialCommunityIcons name="arrow-left" size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Notifications</Text>
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
              </View>
            </View>

            <View style={styles.subHeaderRow}>
              <Text style={styles.subHeaderText}>You have {unreadCount} unread notifications</Text>
              <TouchableOpacity
                onPress={handleMarkAll}
                disabled={markingAll || unreadCount === 0}
                style={[styles.markAllBtn, (markingAll || unreadCount === 0) && styles.markAllBtnDisabled]}
            activeOpacity={0.7}
          >
            {markingAll ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.markAllText}>Mark All Read</Text>
            )}
          </TouchableOpacity>
        </View>
          </SafeAreaView>
        </ImageBackground>
      </View>

      {/* Content area */}
      <View style={styles.contentArea}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Loading notifications...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <MaterialCommunityIcons name="alert-circle" size={20} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={fetchNotifications} style={styles.retryBtn} activeOpacity={0.8}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
            {notifications.length === 0 ? (
              <Text style={styles.emptyText}>No notifications yet.</Text>
            ) : (
              notifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  onMarkRead={handleMarkRead}
                />
              ))
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7F9',
  },
  headerSection: {
    height: 160,
    paddingBottom: 20,
  },
  backgroundImage: {
    height: '100%',
    width: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(44, 95, 111, 0.80)',
  },
  contentArea: {
    flex: 1,
  },
  safeArea: {
    paddingHorizontal: 20,
    flex: 1,
    justifyContent: 'center',

  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  unreadBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 36,
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: '#2563EB',
    fontWeight: '700',
  },
  subHeaderRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subHeaderText: {
    color: '#475569',
    fontSize: 14,
  },
  markAllBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  markAllBtnDisabled: {
    opacity: 0.5,
  },
  markAllText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardMessage: {
    color: '#334155',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardMeta: {
    color: '#94A3B8',
    fontSize: 12,
  },
  unreadPill: {
    backgroundColor: '#1E40AF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  unreadPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  readPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  readPillText: {
    color: '#0EA5E9',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  markReadBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#2563EB',
  },
  markReadText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#475569',
  },
  errorBox: {
    margin: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    color: '#B91C1C',
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: '#B91C1C',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  emptyText: {
    color: '#475569',
    textAlign: 'center',
    marginTop: 40,
  },
});

export default NotificationsScreen;
