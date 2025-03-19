/**
 * Calculate distance between two geographical points using Haversine formula
 * @param {Object} point1 - {lat, lng}
 * @param {Object} point2 - {lat, lng}
 * @returns {number} Distance in kilometers
 */
function calculateDistance(point1, point2) {
    // Implement the Haversine formula to calculate geographic distance

    const convertToRad = Math.PI / 180;
    const radius = 6371;

    let lat1 = point1.lat * convertToRad;
    let long1 = point1.lng * convertToRad;

    let lat2 = point2.lat * convertToRad;
    let long2 = point2.lng * convertToRad;

    diffLat = lat2 - lat1;
    diffLong = long2 - long1;

    let insideRoot =
        Math.pow(Math.sin(diffLat / 2), 2) +
        Math.pow(Math.sin(diffLong / 2), 2) * Math.cos(lat1) * Math.cos(lat2);

    let ans = 2 * radius * Math.asin(Math.sqrt(insideRoot));
    return ans;
}

/**
 * Recommend events for a user
 * @param {Object} user - User data including preferences and location
 * @param {Array} events - Array of event objects
 * @param {Object} eventSimilarity - Object mapping events to similar events
 * @param {number} limit - Maximum number of recommendations to return
 * @returns {Array} Array of recommended event objects
 */
function getRecommendedEvents(user, events, eventSimilarity, limit = 5) {
    // Your implementation here
    let recommendations = [];
    let preferencesExt = [];
    let maxDistance = 0;
    const candidateEvents = new Set();

    // checking whether the user has any preferences
    if (user.preferences.length > 0) preferencesExt = [...user.preferences];

    //checking whether the user has attended any events in the past
    if (user.attendedEvents.length > 0) {
        user.attendedEvents.forEach((Id) => {
            // eventMap to be used here
            const attendedEvent = events.find((event) => event.id === Id);
            //checking whether the attendedEvents have any other categories
            if (attendedEvent && attendedEvent.categories) {
                attendedEvent.categories.forEach((category) => {
                    if (!preferencesExt.includes(category)) {
                        preferencesExt.push(category);
                    }
                });
            }
            // finding the max distance that the user will go
            if (attendedEvent && attendedEvent.location) {
                const distance = calculateDistance(user.location, attendedEvent.location);
                maxDistance = Math.max(distance, maxDistance);
            }

            if (eventSimilarity[Id]) {
                eventSimilarity[Id].forEach((similarEventId) => {
                    if (!user.attendedEvents.includes(similarEventId))
                        candidateEvents.add(similarEventId);
                });
            }
        });
    }
    events.forEach((event) => {
        if (user.attendedEvents.includes(event.id))
            return;

        const distance = calculateDistance(user.location, event.location);
        if (distance > maxDistance * 1.15) {
            return;
        }

        let preferencePoints = 0;
        if (preferencesExt.length > 0) {
            if (event.categories) {
                event.categories.forEach((category) => {
                    if (preferencesExt.includes(category)) {
                        preferencePoints += 1;
                    }
                });
            }
        }

        const similarityPoints = candidateEvents.has(event.id) ? 1 : 0;
        const distancePoints = 1 - distance / (maxDistance * 1.25);
        
        const totalPoints = preferencePoints * 0.4 + similarityPoints * 0.15 +
                                distancePoints * 0.35 + event.popularity * 0.1;
        
        recommendations.push({
            event,
            distancePoints: distancePoints.toFixed(4),
            similarityPoints: similarityPoints,
            preferencePoints: preferencePoints,
            totalPoints: totalPoints
        });
    });
    recommendations.sort((a, b) => b.totalPoints - a.totalPoints);
    // return recommendations.slice(0, limit);
    return recommendations.slice(0, limit).map((item) => item.event);
}

module.exports = {
    calculateDistance,
    getRecommendedEvents,
};
