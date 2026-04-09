import React, {useState, useRef} from 'react';
import {
  View,
  StyleSheet,
  Text,
  Image,
  Dimensions,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors, spacing, borderRadius} from '../../theme/designSystem';

const {width} = Dimensions.get('window');

const slides = [
  {
    id: '1',
    image: require('../../../assets/images/icons/calculator.png'),
    title: 'Calculeaza instant',
    subtitle: 'Afla in cateva secunde cat poti imprumuta de la cele mai bune banci din Romania.',
    color: colors.brand.primary,
  },
  {
    id: '2',
    image: require('../../../assets/images/icons/verify.png'),
    title: 'Verificare 100% online',
    subtitle: 'Conectare automata cu ANAF si Biroul de Credit. Fara deplasari, fara hartii.',
    color: colors.success[500],
  },
  {
    id: '3',
    image: require('../../../assets/images/icons/compare.png'),
    title: 'Compara oferte reale',
    subtitle: 'Primesti oferte personalizate de la 10+ banci partenere, in timp real.',
    color: colors.gold[600],
  },
  {
    id: '4',
    image: require('../../../assets/images/icons/apply.png'),
    title: 'Aplica rapid si gratuit',
    subtitle: 'Depune cererea online. Broker autorizat ANPC, 0 comisioane pentru tine.',
    color: colors.brand.purple,
  },
];

interface WelcomeScreenProps {
  onComplete: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({onComplete}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({index: currentIndex + 1, animated: true});
    } else {
      onComplete();
    }
  };

  const renderSlide = ({item}: {item: typeof slides[0]}) => (
    <View style={styles.slide}>
      <View style={styles.imageContainer}>
        <Image source={item.image} style={styles.slideImage} resizeMode="contain" />
      </View>
      <Text style={styles.slideTitle}>{item.title}</Text>
      <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <TouchableOpacity style={styles.skipButton} onPress={onComplete}>
        <Text style={styles.skipText}>Treci peste</Text>
      </TouchableOpacity>

      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={e => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentIndex && styles.dotActive,
                i === currentIndex && {backgroundColor: slides[currentIndex].color},
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.nextButton, {backgroundColor: slides[currentIndex].color}]}
          activeOpacity={0.8}
          onPress={handleNext}>
          {currentIndex < slides.length - 1 ? (
            <Icon name="arrow-right" size={24} color="#FFFFFF" />
          ) : (
            <Text style={styles.nextButtonText}>Incepe</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  skipButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: spacing.lg,
    zIndex: 10,
    padding: spacing.sm,
  },
  skipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: colors.light[50],
  },
  slide: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: 100,
  },
  imageContainer: {
    width: 200,
    height: 200,
    marginBottom: spacing.xxl,
  },
  slideImage: {
    width: '100%',
    height: '100%',
  },
  slideTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    fontWeight: '700',
    color: colors.light[100],
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  slideSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: colors.light[60],
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 50 : 30,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.dark[400],
  },
  dotActive: {
    width: 24,
    borderRadius: 4,
  },
  nextButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  nextButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default WelcomeScreen;
