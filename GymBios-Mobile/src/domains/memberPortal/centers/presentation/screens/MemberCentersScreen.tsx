import { useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import { CenterCard, type CenterItem } from '../components/CenterCard';
import { CenterDetailModal } from '../components/CenterDetailModal';
import { CenterFiltersModal } from '../components/CenterFiltersModal';

const CENTERS_DATA: CenterItem[] = [
  {
    id: '1',
    name: 'FitZone Premium',
    category: 'Gym',
    address: '14, Hill Road, Bandra West, Mumbai',
    area: 'Bandra West',
    distance: '0.8 km',
    rating: 4.8,
    reviews: 312,
    about:
      'FitZone Premium is a premier fitness destination with 15,000 sq ft of state-of-the-art equipment. Our 24/7 facility offers world-class amenities, certified trainers, and a motivating community.',
    facilities: [
      'Cardio Zone',
      'Free Weights',
      'Group Classes',
      'Steam Room',
      'Locker Room',
      'Juice Bar',
      'Parking',
      'Functional Training',
    ],
    trainers: [
      { name: 'Rahul Sharma', specialty: 'Strength & Conditioning', avatar: 'RS' },
      { name: 'Priya Mehta', specialty: 'HIIT & Cardio', avatar: 'PM' },
      { name: 'Karan Bose', specialty: 'Powerlifting', avatar: 'KB' },
    ],
    timings: 'Mon–Sat: 5:00 AM – 11:00 PM\nSun: 7:00 AM – 9:00 PM',
    genderType: 'Mixed',
    phone: '+91 98200 12345',
    established: '2018',
    plans: [
      {
        id: 'p1',
        name: 'Monthly',
        duration: '1 Month',
        durationMonths: 1,
        price: 2499,
        taxPct: 18,
        features: ['Full gym access', 'Group classes (4/week)', 'Locker access'],
      },
      {
        id: 'p2',
        name: 'Quarterly',
        duration: '3 Months',
        durationMonths: 3,
        price: 6499,
        originalPrice: 7497,
        taxPct: 18,
        features: ['Full gym access', 'Unlimited group classes', 'Locker access', '2 PT sessions'],
        popular: true,
        offer: 'Save ₹998',
      },
      {
        id: 'p3',
        name: 'Annual',
        duration: '12 Months',
        durationMonths: 12,
        price: 22999,
        originalPrice: 29988,
        taxPct: 18,
        features: ['24/7 all-club access', 'Unlimited classes & PT assessment', 'Guest passes (5)', 'Dietician consultation'],
        offer: 'Save ₹6,989',
      },
    ],
  },
  {
    id: '2',
    name: 'Iron Temple Gym & Studio',
    category: 'Studio',
    address: '22, Linking Road, Khar West, Mumbai',
    area: 'Khar West',
    distance: '1.4 km',
    rating: 4.6,
    reviews: 198,
    about:
      'Hardcore training space built for serious lifters, strength athletes, and functional fitness enthusiasts with Olympic platforms and competition racks.',
    facilities: [
      'Olympic Platforms',
      'Power Racks',
      'Turf Track',
      'Sauna',
      'Protein Bar',
      'Physio On-site',
    ],
    trainers: [
      { name: 'Vikram Rao', specialty: 'Bodybuilding & Hypertrophy', avatar: 'VR' },
      { name: 'Sneha Roy', specialty: 'Mobility & Calisthenics', avatar: 'SR' },
    ],
    timings: 'Mon–Sun: 6:00 AM – 10:30 PM',
    genderType: 'Mixed',
    phone: '+91 98200 67890',
    established: '2020',
    plans: [
      {
        id: 'p4',
        name: 'Monthly Pro',
        duration: '1 Month',
        durationMonths: 1,
        price: 2999,
        taxPct: 18,
        features: ['Full weightroom access', 'Open gym 7 days', 'Locker'],
      },
      {
        id: 'p5',
        name: 'Annual Elite',
        duration: '12 Months',
        durationMonths: 12,
        price: 24999,
        originalPrice: 35988,
        taxPct: 18,
        features: ['Full access + recovery suite', '12 PT sessions', 'Custom programming', 'Guest passes (10)'],
        popular: true,
        offer: 'Save ₹10,989',
      },
    ],
  },
  {
    id: '3',
    name: 'Aura Wellness & Pilates Studio',
    category: 'Wellness Center',
    address: '5th Floor, Trade Center, BKC, Mumbai',
    area: 'BKC',
    distance: '3.2 km',
    rating: 4.9,
    reviews: 420,
    about:
      'Holistic sanctuary offering Reformer Pilates, Aerial Yoga, sound baths, and recovery therapies in a serene, eco-conscious atmosphere.',
    facilities: [
      'Reformer Pilates',
      'Yoga Shala',
      'Ice Bath & Sauna',
      'Meditation Lounge',
      'Organic Cafe',
      'Valet Parking',
    ],
    trainers: [
      { name: 'Maya Singh', specialty: 'Master Pilates Instructor', avatar: 'MS' },
      { name: 'Tara Deshmukh', specialty: 'Ashtanga Yoga & Breathwork', avatar: 'TD' },
    ],
    timings: 'Mon–Sat: 6:30 AM – 9:00 PM\nSun: 8:00 AM – 6:00 PM',
    genderType: 'Ladies Only',
    phone: '+91 98200 99887',
    established: '2021',
    plans: [
      {
        id: 'p6',
        name: 'Reformer 10-Class Pack',
        duration: '2 Months',
        durationMonths: 2,
        price: 8500,
        taxPct: 18,
        features: ['10 Reformer sessions', 'Ice bath access', 'Locker & towel service'],
      },
      {
        id: 'p7',
        name: 'Unlimited Wellness Annual',
        duration: '12 Months',
        durationMonths: 12,
        price: 45000,
        originalPrice: 60000,
        taxPct: 18,
        features: ['Unlimited Pilates & Yoga', 'Weekly recovery suite session', 'Nutrition coach'],
        popular: true,
        offer: 'Save ₹15,000',
      },
    ],
  },
];

const CATEGORY_TABS = ['All', 'Gym', 'Fitness Center', 'Wellness Center', 'Studio'];

export function MemberCentersScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedGender, setSelectedGender] = useState('All');
  const [sortBy, setSortBy] = useState('Rating');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState<CenterItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);

  const filteredCenters = useMemo(() => {
    return CENTERS_DATA.filter((center) => {
      const matchesSearch =
        center.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        center.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
        center.address.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat =
        selectedCategory === 'All' || center.category === selectedCategory;

      const matchesGender =
        selectedGender === 'All' || center.genderType === selectedGender;

      return matchesSearch && matchesCat && matchesGender;
    }).sort((a, b) => {
      if (sortBy === 'Rating') return b.rating - a.rating;
      if (sortBy === 'Distance') {
        return parseFloat(a.distance) - parseFloat(b.distance);
      }
      return 0;
    });
  }, [searchQuery, selectedCategory, selectedGender, sortBy]);

  const handleCenterPress = (center: CenterItem) => {
    setSelectedCenter(center);
    setIsDetailOpen(true);
  };

  const handleResetFilters = () => {
    setSelectedCategory('All');
    setSelectedGender('All');
    setSortBy('Rating');
  };

  const onRefresh = () => {
    setIsRefetching(true);
    setTimeout(() => {
      setIsRefetching(false);
    }, 600);
  };

  return (
    <View style={styles.container}>
      {/* Search & Filter Header */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Feather name="search" size={18} color={BrandColors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search gym, area, or location..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable hitSlop={8} onPress={() => setSearchQuery('')}>
              <Feather name="x" size={16} color={BrandColors.textSecondary} />
            </Pressable>
          )}
        </View>

        <Pressable
          style={styles.filterButton}
          onPress={() => setIsFiltersOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Open Filters"
        >
          <Feather name="sliders" size={18} color={BrandColors.teal} />
        </Pressable>
      </View>

      {/* Category Chips Bar */}
      <View style={styles.categoryBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORY_TABS.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <Pressable
                key={cat}
                style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    isSelected && styles.categoryChipTextSelected,
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Centers List */}
      <ScrollView
        style={styles.scrollList}
        contentContainerStyle={styles.scrollListContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={BrandColors.teal}
            colors={[BrandColors.teal]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.resultCountRow}>
          <Text style={styles.resultCountText}>
            Showing {filteredCenters.length} centers
          </Text>
        </View>

        {filteredCenters.length > 0 ? (
          filteredCenters.map((center) => (
            <CenterCard key={center.id} center={center} onPress={handleCenterPress} />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Feather name="map-pin" size={32} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No centers found</Text>
            <Text style={styles.emptyDesc}>Try adjusting your search query or filters.</Text>
          </View>
        )}
      </ScrollView>

      {/* Detail Modal */}
      <CenterDetailModal
        visible={isDetailOpen}
        center={selectedCenter}
        onClose={() => setIsDetailOpen(false)}
      />

      {/* Filters Modal */}
      <CenterFiltersModal
        visible={isFiltersOpen}
        selectedCategory={selectedCategory}
        selectedGender={selectedGender}
        sortBy={sortBy}
        onSelectCategory={setSelectedCategory}
        onSelectGender={setSelectedGender}
        onSelectSort={setSortBy}
        onReset={handleResetFilters}
        onClose={() => setIsFiltersOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.screenBackground,
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.surface,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: Spacing.two,
  },
  searchInput: {
    flex: 1,
    fontSize: TypographyScale.body,
    color: BrandColors.textPrimary,
    paddingVertical: 0,
  },
  filterButton: {
    padding: Spacing.two + 3,
    borderRadius: Radius.md,
    backgroundColor: BrandColors.surface,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBar: {
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryScroll: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  categoryChip: {
    paddingHorizontal: Spacing.three + 2,
    paddingVertical: Spacing.one + 3,
    borderRadius: Radius.full,
    backgroundColor: BrandColors.surface,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryChipSelected: {
    backgroundColor: BrandColors.teal,
    borderColor: BrandColors.teal,
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: BrandColors.textSecondary,
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scrollList: {
    flex: 1,
  },
  scrollListContent: {
    padding: Spacing.four,
    paddingBottom: Spacing.six + 50,
  },
  resultCountRow: {
    marginBottom: Spacing.three,
  },
  resultCountText: {
    fontSize: TypographyScale.small,
    fontWeight: '600',
    color: BrandColors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six * 2,
    gap: Spacing.two,
  },
  emptyTitle: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  emptyDesc: {
    fontSize: 13,
    color: BrandColors.textSecondary,
    textAlign: 'center',
  },
});
