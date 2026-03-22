# Reanimated Rules
- All JS calls from worklets MUST use runOnJS
- useSharedValueEffect is REMOVED in 4.x — use useAnimatedReaction
- cancelAnimation before any animation reversal
- mode stored as SharedValue, never useState
- Snap epsilon = 0.005
- Haptic detent at 0.75 bidirectional with 200ms cooldown
