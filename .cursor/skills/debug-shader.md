---
name: debug-shader
description: Debug ShaderTherm crossfade issue
---
# ShaderTherm Debug
Known bug: ShaderTherm renders fully visible despite crossfadeTherm initializing to 0.0.
Top candidates:
- Skia uniform default behavior before SharedValue bridge fires
- Premultiplied alpha with RGB not multiplied by uCrossfade
Steps:
1. Check initial value of crossfadeTherm SharedValue
2. Add __DEV__ logging to useAnimatedReaction bridge
3. Verify Skia uniform receives 0.0 on first frame
4. Check if shader multiplies RGB by uCrossfade alpha
