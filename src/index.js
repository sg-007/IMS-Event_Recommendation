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

    //
    const eventMap = new Map();
    events.forEach((event) => {
        eventMap.set(event.id, event);
    });

    let recommendations = [];
    let preferencesExt;
    let maxDistance = 0;
    let candidateEvents = new Set();

    // checking whether the user has any preferences
    preferencesExt = user.preferences.length > 0 ? new Set(user.preferences) : new Set();

    /* 
    1. checking whether the user has attended any events in the past
    2. if he has attended then add those categories of the events in the preferencesExt array
    3. then of those attended events find the maximum distance the user has gone to for an event
    4. find candidateEvents based on events similar to the attended events 
    */

    if (user.attendedEvents.length > 0) {
        user.attendedEvents.forEach((Id) => {
            // eventMap to be used here
            const attendedEvent = eventMap.get(Id);

            if (attendedEvent && attendedEvent.categories) {
                attendedEvent.categories.forEach((category) => {
                    if (preferencesExt.size === 0 || !preferencesExt.has(category)) {
                        preferencesExt.add(category);
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

    if (user.attendedEvents.length === 0) {
        // find new maximum distance based on the nearest user with attended events
        // lets take this to be 0, assuming that user has certain preferences but shifted to 
        // a new city and hence has no events and just putting distance_limit to 25 km;
        DISTANCE_LIMIT = 25;
    }

    //testing
    // for user[0] the nearest users are in the radius of 57 km
    // for a real-scenario I'm finding users in a 5 km radius, with similar preferences
    // and their corresponding attendedEvents

    // for no preferenes we can do either the below thing or 
    // use event similarity and add them in the candidateEvents set as done above
    // if (preferencesExt.size === 0) {
    //     const newEvents = new Set(generateEventsFromNearbyUsers(user, users, DISTANCE_LIMIT));
    //     // console.log(newEvents);
    //     candidateEvents = new Set([...candidateEvents, ...newEvents]); 
    // }

    // find similar events based on preferences and add it to candidate events
    // the above approach of finding nearby users with similar preferences doesn't work here
    // because while testing I found that none of the users attended the events that aligns with their preferences
    // I need to find similar events related to their preferences
    // if (user.preferences.length > 0) {
    //     const similarEvents = new Set(generateSimilarEvents(user.preferences, eventSimilarity, events));
    // }
    // printEventDetails(newEvents, eventMap);

    //scoring events based on similarity, distance and preference matching

    // scoreEvents(user, events, recommendations, preferencesExt, candidateEvents, DISTANCE_LIMIT);

    const markEvents = new Set();

    const generateRecommendationsbyDistance = ((distance_limit) => {
        const newRecommendations = [];
        scoreEvents(user, events, newRecommendations, preferencesExt, markEvents, candidateEvents, distance_limit);
        recommendations.push(...newRecommendations);
    });

    generateRecommendationsbyDistance(DISTANCE_LIMIT);

    while (recommendations.length < limit) {
        DISTANCE_LIMIT *= 1.5;
        generateRecommendationsbyDistance(DISTANCE_LIMIT);
    }


    // better to use a weighted score rather than judging the event only by its popularity

    recommendations.sort((a, b) => b.score - a.score);
    return recommendations.slice(0, limit).map((item) => item.event);
    // return recommendations.slice(0, limit);
}

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
                        preferencePoints += 1;
                    }
                });
            }
        }

        const similarityPoints = candidateEvents.has(event.id) ? 1 : 0;
        const distancePoints = 1 - distance / distanceLimit;
        let totalPoints = 0;

        if (preferencePoints === 0) {
            totalPoints = distancePoints * 0.45 + event.popularity * 0.35 + similarityPoints * 0.2;
        }
        else {
            totalPoints = preferencePoints * 0.4 + similarityPoints * 0.15 + distancePoints * 0.35 + event.popularity * 0.1;
        }

        newRecommendations.push({
            event,
            distancePoints: distance.toFixed(4),
            // similarityPoints: similarityPoints,
            // preferencePoints: preferencePoints,
            score: totalPoints,
        });

        markEvents.add(event.id);
    });
}

//testing

// this function returns events based on the events attended by the users in a given distance from the user.
function generateEventsFromNearbyUsers(user, users, radius) {
    const favorableEvents = new Set();

    const similarUsers = users.filter((neighbour) => {
        if (neighbour.id === user.id) {
            return false;
        }

        if (calculateDistance(user.location, neighbour.location) > radius) {
            return false;
        }

        return (
            neighbour.preferences &&
            user.preferences &&
            neighbour.preferences.some((pref) => user.preferences.includes(pref))
        );
    });

    similarUsers.forEach((similarUser) => {
        if (similarUser.attendedEvents.length > 0) {
            similarUser.attendedEvents.forEach((eventId) => {
                favorableEvents.add(eventId);
            });
        }
    });
    return favorableEvents;
}

function printEventDetails(events1, eventMap) {
    const eventArray = Array.from(events1);
    console.log(eventArray);
    eventArray.forEach((id) => {
        console.log(eventMap.get(id));
        console.log();
    });
}

module.exports = {
    calculateDistance,
    getRecommendedEvents,
};
