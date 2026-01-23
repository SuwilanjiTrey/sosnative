
__________________________________________________
__________SAFE CIRCLE DEBUG DOCUMENTATION_________

This document serves as a report documenting failures encountered during internal testing.
SAFE CIRCLE V2.4.1

___________________________________________________

DIAGNOSIS

Safe Circle encountered multiple unresolved issues that either caused a function to fail or not work as intended. these errors affect the users experience and in some cases, the users interface as well.


1. Authentication:
	- authentication has static vaues with no real OTP implementation, system currently accepts any 4 digit code to access the platform which leave the application vulnarable to attack... 
	FIX: -> Add email OTP using platforms like email.js to send OTP (one time passwords) for proper user initialization
	
2. Notification Handling:
	- it was shown that some devices were getting proper circle invitation notifications while others were not, this situtation happened with just a few testers but changes need to accomodate for all devices. 
	FIX: -> make sure that the sending and recieving of notifications happens seamlessly and quickly.
	
3. Homepage Map:
	- the homepage map has some errors, showing the map of the entire globe rather than your location if you have one or more users in your circke, this leads to the user needing to zoom in everytime they want to see something.
	FIX: -> Ensure that the coordinates of the user and their circle are visible properly on the homepage map.
	
4. Location Finding (main map):  --me and malundu
	- a few users were not able to see any of their circle members on the map, this could be an issue with user initialization or the device being used.
	- location tracking when a user in trouble (*giving directions*) takes you to google maps instead.  
	FIX: -> Ensure the map is working systematically and correctly.
		 -> Make sure that all routing functions are within the apps capabilities allowing the responder to track the user from the app.
		 
5. Ambiguous Mobile numbers: (‼️*CRITICAL*‼️) --me ✅️
	- ambiguous mobile numbers happen when one user has two different formats in the database, this issue happens primarily during inititialization. a number will have +260 9xxxxxxxx and also 09xxxxxxxx but have one single user. this inconsistency
	FIX: -> Ensure that only one entry per user-number thats one of a unique identifiers in the system.
	
6. profile picture upload: --me and malundu
	- profile picture upload is not operational
	
7. Payment Gateway: -- malundu
	- need for finalizing payments in the app. preferably using local payment methods (NOT STRIPE)
---

AUXILIARY ENHANCEMENTS

---

1. *Add extra information on login to tell the user if its a connection (network issue) or its an authentication issue*
2. *Remove all unnecessary logs/alerts (this directly applies to the payment gateway logs)* --me ✅️
3. *OPTIONAL: Add interactive background (or just nice background designs the app looks too white)*
