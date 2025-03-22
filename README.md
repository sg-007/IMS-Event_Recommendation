# Event Recommendation Algorithm

## Approach
This was a really nice challenge to solve, I'm a bit rusty with Javascript and so did not get too complicated and just used arrays, sets and maps. This challenge felt more like a product design after a certain point.

### Key Components

1. **Distance Calculation**
   - Implements the Haversine formula to calculate the geographic distance between two points

2. **Preference Extension**
   - Combines given user preferences with categories from previously attended events if any
   - Maintains a frequency count for each preference to give more weight to recurring interests

3. **Maximum Travel Distance Determination**
   - Calculates how far a user is willing to travel based on their event attendance history
   - Uses a 25% buffer beyond the maximum historical distance to include slightly further events

4. **Similarity Matching**
   - Uses event similarity data to find events that are similar to those previously attended
   - Builds a set of candidate events for recommendation

5. **Weighted Scoring System**
   - Different scoring weights based on user types:
     - Users with preferences but no attendance history
     - Users with attendance history but no given preferences
     - Users with both preferences and attendance history
     - Users with neither history nor given preferences

### Optimizations

- Uses Maps and Sets for O(1) lookups of events and preferences
- Implements early filtering to avoid unnecessary calculations
- Marks processed events to prevent duplicate scoring
- Progressive distance expansion when insufficient recommendations are found

## Assumptions

1. **Distance Preferences**
   - Users are willing to travel up to 25% further than their maximum historical travel distance
   - New users and users with no attendance history are initially assumed to travel up to 25km
   - Distance limit is progressively expanded if insufficient recommendations are found

2. **Scoring Weights**
   - Different scoring weights for different user types:
     - For users with preferences but no history: preference (40%), popularity (35%), distance (30%)
     - For users with no preferences and no history: distance (45%), popularity (55%)
     - For users with both and for users with history but no preference: preference (40%), distance (35%), similarity (15%), popularity (10%)

3. **Preference Weighting**
   - Categories that appear multiple times in a user's history receive higher weights based on their frequency.

