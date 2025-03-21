/**
 * Calculate distance between two geographical points using Haversine formula
 * @param {Object} point1 - {lat, lng}
 * @param {Object} point2 - {lat, lng}
 * @returns {number} Distance in kilometers
 */
function calculateDistance(point1, point2) {
    // Implement the Haversine formula to calculate geographic distance

    const convertToRad = Math.PI / 180;
    const earthRadius = 6371;

    let lat1 = point1.lat * convertToRad;
    let long1 = point1.lng * convertToRad;

    let lat2 = point2.lat * convertToRad;
    let long2 = point2.lng * convertToRad;

    diffLat = lat2 - lat1;
    diffLong = long2 - long1;

    let insideRoot =
        Math.pow(Math.sin(diffLat / 2), 2) +
        Math.pow(Math.sin(diffLong / 2), 2) * Math.cos(lat1) * Math.cos(lat2);

    let ans = 2 * earthRadius * Math.asin(Math.sqrt(insideRoot));
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

    //eventMap for O(1) lookups
    const eventMap = new Map();
    events.forEach((event) => {
        eventMap.set(event.id, event);
    });

    let recommendations = [];
    let preferencesExt = new Map();
    let maxDistance = 0;
    let candidateEvents = new Set();

    /*
    1. checking whether the user has any preferences
    2. if yes then create a map to store the preference and its count
    3. this map will be later used in calculating the final weighted score
    */
    if (user.preferences && user.preferences.length > 0) {
        user.preferences.forEach((preference) => {
            preferencesExt.set(preference, 1);
        })
    }

    /* 
    1. checking whether the user has attended any events in the past
    2. If he has attended then append those categories of the events in the preferencesExt array
    3. Then of those attended events find the maximum distance the user has gone to for an event
    4. find candidateEvents based on events similar to the attended events 
    */

    if (user.attendedEvents && user.attendedEvents.length > 0) {
        user.attendedEvents.forEach((Id) => {
            const attendedEvent = eventMap.get(Id);

            if (attendedEvent && attendedEvent.categories.length > 0) {
                attendedEvent.categories.forEach((category) => {
                    if (preferencesExt.size === 0 || !preferencesExt.has(category)) {
                        preferencesExt.set(category, 1);
                    }
                    else {
                        preferencesExt.set(category, preferencesExt.get(category) + 1);
                    }
                });
            }

            // finding the max distance that the user will go
            if (attendedEvent && attendedEvent.location) {
                const distance = calculateDistance(user.location, attendedEvent.location);
                maxDistance = Math.max(distance, maxDistance);
            }
            //finding similar events to the attended events
            if (eventSimilarity[Id]) {
                eventSimilarity[Id].forEach((similarEventId) => {
                    if (!user.attendedEvents.includes(similarEventId))
                        candidateEvents.add(similarEventId);
                });
            }
        });
    }

    // assuming a user would be willing to go a distance 25% more than the maximum distance
    let DISTANCE_LIMIT = maxDistance * 1.25;

    /*   
    if the user has not attended any events then the maximum distance that the user would be willing
    to go for an event is assumed is 25 Km which will be manipulated later in the function
    */
    if (user.attendedEvents.length === 0) {
        DISTANCE_LIMIT = 25;
    }

    /*
    this set will be used to mark events that have been traversed and their points
    fulfilling the criteria of a good recommendation will not be calculated again
    */
    const markEvents = new Set();

    /*  
    using the below function to return atleast 'limit' number of events, here 5, 
    because while testing I found cases when there are no events in proximity of the user and 
    hence the algorithm returned less than 5 events so unless there are atleast 5 events 
    in the recommendations array, the below will keep on running and if the DISTANCE_LIMIT becomes 
    too large, just break from the loop 
    */
    const generateRecommendationsbyDistance = (distance_limit) => {
        const newRecommendations = [];
        scoreEvents(
            user,
            events,
            newRecommendations,
            preferencesExt,
            markEvents,
            candidateEvents,
            distance_limit
        );
        recommendations.push(...newRecommendations);
    };

    generateRecommendationsbyDistance(DISTANCE_LIMIT);

    while (recommendations.length < limit) {
        DISTANCE_LIMIT *= 1.5;
        generateRecommendationsbyDistance(DISTANCE_LIMIT);

        if (DISTANCE_LIMIT > 4500) break;
    }

    /*
    using a weighted score to better judge the event rather than completely depending on the
    popularity of the event, refer to the implementation of scoreEvents method for weighted score calculation
    */
    recommendations.sort((a, b) => b.score - a.score);
    return recommendations.slice(0, limit).map((item) => item.event);
}

/* 
1.This function below scores the events based on the user preferences, candidateEvents (past behaviour),
and the proximity from the user location.
2.Also, for different kinds of users, different weights have been assumed for a more realistic recommendation.
*/
function scoreEvents(user, events, newRecommendations, preferencesExt, markEvents, candidateEvents, distanceLimit) {
    events.forEach((event) => {

        if (markEvents.has(event.id)) return;

        if (user.attendedEvents.length > 0 && user.attendedEvents.includes(event.id)) return;

        const distance = calculateDistance(user.location, event.location);
        if (distance > distanceLimit) return;

        let preferencePoints = 0;
        if (preferencesExt.size > 0) {
            if (event.categories) {
                event.categories.forEach((category) => {
                    if (preferencesExt.has(category)) {
                        preferencePoints += preferencesExt.get(category);
                    }
                });
            }
        }

        const similarityPoints = candidateEvents.has(event.id) ? 1 : 0;
        const distancePoints = 1 - distance / distanceLimit;
        let weightedScore = 0;

        // will run in testcase2
        if (preferencePoints !== 0 && candidateEvents.size === 0) {
            weightedScore = distancePoints * 0.3 + event.popularity * 0.35 + preferencePoints * 0.4;
        }
        // will run in testcase4
        else if (preferencePoints === 0) {
            weightedScore = distancePoints * 0.45 + event.popularity * 0.35 + similarityPoints * 0.2;
        }
        // will run in testcase1 and testcase3
        else {
            weightedScore = preferencePoints * 0.4 + distancePoints * 0.35 + similarityPoints * 0.15 + event.popularity * 0.1;
        }

        newRecommendations.push({
            event,
            score: weightedScore,
        });

        markEvents.add(event.id);
    });
}

module.exports = {
    calculateDistance,
    getRecommendedEvents,
};
