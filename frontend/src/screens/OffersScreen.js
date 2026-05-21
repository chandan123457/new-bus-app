import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatDiscountLabel = (offer) => {
  if (offer.discountType === 'PERCENTAGE') {
    return `${offer.discountValue}% OFF`;
  }
  return `₹${offer.discountValue} OFF`;
};

const getUsesLeft = (offer) => {
  if (offer.usageLimit == null) return null;
  const used = offer.usageCount ?? 0;
  return Math.max(0, offer.usageLimit - used);
};

// ── Offer Card ───────────────────────────────────────────────────────────────

const OfferCard = ({ offer }) => {
  const discountLabel = formatDiscountLabel(offer);
  const usesLeft = getUsesLeft(offer);
  const validFrom = formatDate(offer.validFrom);
  const validUntil = formatDate(offer.validUntil);
  const busServiceName = offer.busServiceName || null;

  return (
    <View style={styles.card}>
      {/* Top row: code pill + discount badge */}
      <View style={styles.cardTopRow}>
        <View style={styles.codePill}>
          <Text style={styles.codeText}>{offer.code || 'OFFER'}</Text>
        </View>
        <Text style={styles.discountLabel}>{discountLabel}</Text>
      </View>

      {/* Description */}
      <Text style={styles.description}>{offer.description || 'Special offer available'}</Text>

      {/* Bus service badge */}
      {busServiceName && (
        <View style={styles.serviceBadge}>
          <Text style={styles.serviceBadgeIcon}>🚌</Text>
          <Text style={styles.serviceBadgeText}>Offer from {busServiceName}</Text>
        </View>
      )}

      {/* Divider */}
      <View style={styles.divider} />

      {/* Details */}
      <View style={styles.detailsContainer}>
        {validFrom && validUntil && (
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>📅</Text>
            <Text style={styles.detailText}>
              Valid: {validFrom} – {validUntil}
            </Text>
          </View>
        )}

        {offer.minBookingAmount != null && (
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>💰</Text>
            <Text style={styles.detailText}>
              Minimum booking: ₹{offer.minBookingAmount}
            </Text>
          </View>
        )}

        {offer.discountType === 'PERCENTAGE' && offer.maxDiscount != null && (
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>🎯</Text>
            <Text style={styles.detailText}>
              Maximum savings: ₹{offer.maxDiscount}
            </Text>
          </View>
        )}

        {usesLeft != null && (
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>⏳</Text>
            <Text style={styles.detailText}>Uses left: {usesLeft}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

// ── Screen ───────────────────────────────────────────────────────────────────

const OffersScreen = () => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOffers = async () => {
    try {
      setLoading(true);
      setError('');
      const token = await AsyncStorage.getItem('authToken');
      const response = await api.getOffers(token);

      if (response.success) {
        const list = Array.isArray(response.data)
          ? response.data
          : response.data?.offers;
        setOffers(Array.isArray(list) ? list : []);
      } else {
        setError(response.error || 'Failed to load offers');
      }
    } catch (err) {
      setError(err.message || 'Failed to load offers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Header background */}
      <ImageBackground
        source={require('../../assets/landing-background.jpg')}
        style={styles.headerBg}
        resizeMode="cover"
      >
        <View style={styles.headerOverlay} />
        <SafeAreaView edges={['top']} style={styles.safeHeader}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Offers & Deals</Text>
          </View>
        </SafeAreaView>
      </ImageBackground>

      {/* Cards panel – overlaps header */}
      <View style={styles.panel}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.stateBox}>
              <ActivityIndicator size="large" color="#E07B00" />
              <Text style={styles.stateText}>Loading offers...</Text>
            </View>
          ) : error ? (
            <View style={styles.stateBox}>
              <Text style={styles.stateText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={fetchOffers}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : offers.length === 0 ? (
            <View style={styles.stateBox}>
              <Text style={styles.stateEmoji}>🎟️</Text>
              <Text style={styles.stateTitle}>No Active Offers</Text>
              <Text style={styles.stateText}>Check back later for exciting deals!</Text>
            </View>
          ) : (
            offers.map((offer) => (
              <OfferCard key={offer.id || offer.code} offer={offer} />
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
};

// ── Styles ───────────────────────────────────────────────────────────────────

const HEADER_HEIGHT = SCREEN_HEIGHT * 0.22;
const PANEL_OVERLAP = 28;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F0',
  },

  // Header
  headerBg: {
    height: HEADER_HEIGHT,
    width: '100%',
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(44, 95, 111, 0.82)',
  },
  safeHeader: { flex: 1 },
  header: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: PANEL_OVERLAP,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Panel
  panel: {
    flex: 1,
    backgroundColor: '#FFF8F0',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -PANEL_OVERLAP,
    overflow: 'hidden',
  },
  scrollContent: {
    padding: 16,
    paddingTop: 20,
    paddingBottom: 100,
  },

  // State
  stateBox: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  stateEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
  },
  stateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 6,
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#E07B00',
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },

  // ── Offer Card ────────────────────────────────────────────────────────────
  card: {
    borderRadius: 18,
    marginBottom: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#2C5F6F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#D8EEF2',
  },

  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    backgroundColor: '#2C5F6F',
  },
  codePill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  codeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  discountLabel: {
    color: '#FFD166',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  // Description
  description: {
    color: '#1F2937',
    fontSize: 15,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    lineHeight: 21,
  },

  // Bus service badge
  serviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F3F8',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  serviceBadgeIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  serviceBadgeText: {
    color: '#2C5F6F',
    fontSize: 13,
    fontWeight: '600',
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: '#E8F4F8',
    marginHorizontal: 16,
    marginBottom: 10,
  },

  // Details
  detailsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  detailIcon: {
    fontSize: 13,
    marginRight: 8,
    width: 18,
    textAlign: 'center',
  },
  detailText: {
    color: '#4B5563',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
});

export default OffersScreen;
