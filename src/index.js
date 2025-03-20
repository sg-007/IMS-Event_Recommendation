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
    const fs = require("fs");
    const data = JSON.parse(fs.readFileSync("./event_recommendation_data.json", "utf8"));
    const { users } = data;

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

    /*     1. checking whether the user has attended any events in the past
    2. if he has attended then add those categories of the events in the preferencesExt array
    3. then of those attended events find the maximum distance the user has gone to for an event
    4. find candidateEvents based on events similar to the attended events */

    if (user.attendedEvents.length > 0) {
        user.attendedEvents.forEach((Id) => {
            // eventMap to be used here
            const attendedEvent = eventMap.get(Id);

            /*          checking whether the attendedEvents has any other categories
            this part of code may be redundant, because while calculating score below,
            similar events are already part of candidateEvents set
            and here I'm just basically extended the preferences of the user
            that suggests for eg, that if the user is interested in technology
            and attends a event that has a theme of biology and quantum physics as well
            then this code below will add those categories as well to the preferencesExt array
            increasing the natural preferences of the user, but this is what happens in reality
            but if a person lets say a north indian orders a podi masala dosa for the first time and likes it
            he would definitely want to eat different varieties of that and if I don't add that podi dosa
            in the preferences array then in future he would never get recommended similar dishes */

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
        //find new maximum distance based on the nearest user with attended events
        DISTANCE_LIMIT = 0;
    }

    //testing
    // for user[0] the nearest users are in the radius of 57 km
    // for a real-scenario I'm finding users in a 5 km radius, with similar preferences
    // and their corresponding attendedEvents

    // for no preferenes we can do either the below thing or 
    // use event similarity and add them in the candidateEvents set as done above
    if (preferencesExt.size === 0) {
        const newEvents = new Set(generateEventsFromNearbyUsers(user, users, 57));
        // console.log(newEvents);
        candidateEvents = new Set([...candidateEvents, ...newEvents]);
    }

    // find similar events based on preferences and add it to candidate events
    // the above approach of finding nearby users with similar preferences doesn't work here
    // because while testing I found that none of the users attended the events that aligns with their preferences
    // I need to find similar events related to their preferences
    // if (user.preferences.length > 0) {
    //     const similarEvents = new Set(generateSimilarEvents(user.preferences, eventSimilarity, events));
    // }
    // printEventDetails(newEvents, eventMap);

    //scoring events based on similarity, distance and preference matching
    scoreEvents(
        user,
        events,
        recommendations,
        preferencesExt,
        candidateEvents,
        DISTANCE_LIMIT
    );

    recommendations.sort((a, b) => b.score - a.score);
    return recommendations.slice(0, limit).map((item) => item.event);
    // return recommendations.slice(0, limit);
}

//testing
function printEventDetails(events1, eventMap) {
    const eventArray = Array.from(events1);
    console.log(eventArray);
    eventArray.forEach((id) => {
        console.log(eventMap.get(id));
        console.log();
    });
}

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

// function generateSimilarEvents(preferences, eventSimilarity, events) {

// }

function scoreEvents(
    user,
    events,
    recommendations,
    preferencesExt,
    candidateEvents,
    distanceLimit
) {
    events.forEach((event) => {
        if (user.attendedEvents.length > 0 && user.attendedEvents.includes(event.id)) return;

        const distance = calculateDistance(user.location, event.location);
        if (distanceLimit > 0 && distance > distanceLimit) {
            return;
        }

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

        // if (user.preferences.length > 0) {
        //     if (user.preferences.some((cat) => event.categories.includes(cat))) {

        // }

        // }
        // if (eventSimilarity[event.id]) {
        //     eventSimilarity[event.id].forEach((eventId) => {
        //         if (user.prefernces.some())
        //     });

        const similarityPoints = candidateEvents.has(event.id) ? 1 : 0;
        const distancePoints = distanceLimit !== 0 ? 1 - distance / distanceLimit : 1 / distance;

        const totalPoints =
            preferencePoints * 0.4 + 
            similarityPoints * 0.15 +
            distancePoints * 0.35 +
            event.popularity * 0.1;

        recommendations.push({
            event,
            // distancePoints: distancePoints.toFixed(4),
            // similarityPoints: similarityPoints,
            // preferencePoints: preferencePoints,
            score: totalPoints,
        });
    });
}

module.exports = {
    calculateDistance,
    getRecommendedEvents,
};
