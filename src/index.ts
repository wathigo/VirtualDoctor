import {
    $query,
    $update,
    Record,
    StableBTreeMap,
    Vec,
    nat64,
    ic, 
    Opt,
    int32,
    Principal,
} from "azle";

type Profile = Record<{
    id: int32;
    principal: Principal;
    username: string;
    createdAt: nat64;
}>;


type Booking = Record<{
    id: int32;
    userId: int32;
    doctorId: int32;
    createdAt: nat64;
}>;

type BookingPayload = Record<{
    userId: int32,
    doctorId: int32
}>;

// simulates an enum
const ProfileType = Object.freeze({User: "User", Doctor: "Doctor"})

const users = new StableBTreeMap<int32, Profile>(0, 38, 1000);
const doctors = new StableBTreeMap<int32, Profile>(1, 38, 2440);
const bookings = new StableBTreeMap<int32, Booking>(2, 38, 4000);

$update
export function createProfile(username: string, profileType: string): Profile {
  if (!username.trim()) {
    throw new Error("No username provided!");
  }
  // ensures that profileType is either Doctor or User. Otherwise, an error will be thrown
  if (profileType === ProfileType.Doctor || profileType === ProfileType.User) {
    // uses the argument for the profileType to determine whether the new profile is for a doctor or user
    const storage = profileType === ProfileType.User ? users : doctors;
    // Check for an existing username
    const checkUsername = storage
      .values()
      .find((profile) => profile.username === username);
    if (checkUsername) {
      throw new Error("Username already exist!");
    }
    // uses the argument for the profileType to determine whether the new profile is for a doctor or user
    const idType: string =
      profileType === ProfileType.User ? "users" : "doctors";

    // Add a new user to the users record
    try {
      const profile: Profile = {
        id: storage.isEmpty() ? 1 : generateId(idType),
        principal: ic.caller(),
        username,
        createdAt: ic.time(),
      };
      // saves profile to the respective storage i.e doctors or users
      storage.insert(profile.id, profile);
      return profile;
    } catch (err) {
      throw new Error(`Error creating a new profile: ${err}`);
    }
  }

  throw new Error("Invalid profile type");
}

$update
export function deleteProfile(id: int32, profileType: string): Opt<Profile> {
  // Data input validation
  if (!id) {
    throw new Error("Invalid user id!");
  }
  // ensures that profileType is either Doctor or User. Otherwise, an error will be thrown
  if (profileType === ProfileType.Doctor || profileType === ProfileType.User) {
    const storage = profileType === ProfileType.User ? users : doctors;
    const idType = profileType === ProfileType.User ? "userId" : "doctorId";

    if(!storage.containsKey(id)){
        throw new Error(`ID=${id} does not exist in ${profileType} storage.`)
    }

    // Only the owner/principal of a profile can delete the profile
    if(storage.get(id).Some?.principal.toString() !== ic.caller().toString()){
        throw new Error("Unauthorized caller.")
    }
    // Delete users bookings
    try {
      bookings.values().forEach((booking) => {
        // Uses bracket notation to access the userId or doctorId property based off the argument of the profileType parameter
        // checks whether the value of the accessed property matches the id of the profile to delete
        if (booking[idType] === id) {
          bookings.remove(booking.id);
        }
      });
    } catch (err) {
      throw new Error(`Couldn't delete ${profileType} bookings`);
    }

    try {
      return storage.remove(id);
    } catch (err) {
      throw `Couln't delete profile ${err}`;
    }
  }
  throw new Error("Invalid profile type");
}

$query
export function getUsers(): Vec<Profile> {
    try {
        if(users.isEmpty()){
            throw new Error(`There is currently no user profile in storage.`)
        }
        return users.values();
    } catch (err) {
        throw new Error(`Failed to fetch users${err}`);
    };
}

$query;
export function getUser(id: int32): Profile {
    // Data input validation
    if(!id) {
        throw new Error("Invalid user id!");
    }

    try {
        const user = users.get(id).Some;
        if(!user){
            throw new Error("User not found");
        }
        return user;
    } catch (err) {
        throw (`Couldn't find a user with the specified id ${err}`);
    }
}

$query;
export function getDoctors(): Vec<Profile> {
    try {
        if(doctors.isEmpty()){
            throw new Error("There is currently no doctor profile in storage.")
        }
        return doctors.values();
    } catch(err) {
        throw new Error(`Error fetching doctors ${err}`);
    }
}

$query;
export function getDoctor(id: int32): Profile {
    // validate input field
    if(!id) {
        throw new Error("Invalid id field")
    }

    try {
        const doctor = doctors.get(id).Some;
        if(!doctor){
            throw new Error("Doctor not found")
        } 
        return doctor;
    } catch(err) {
        throw new Error(`Error fetching doctor ${err}`)
    }
}


$update;
export function createBooking(payload: BookingPayload): Booking {
    // validate input fields
    const { userId, doctorId } = payload;

    // Validate user and doctor existing records
    const user = users.containsKey(userId);
    const doc = doctors.containsKey(doctorId);
    if(!doc || !user) {
        throw new Error("user or doctor with the given Id does not exist");
    }

    // Check for existing booking
    const checkBooking = bookings.values().find(
        (
            booking => booking.userId === userId && booking.doctorId === doctorId
            ));
    if (checkBooking) {
        throw new Error("A session has already been booked!");
    }

    // Create new booking record
    try {
        const booking: Booking = {
            id: bookings.isEmpty() ? 1 : generateId("bookings"),
            userId,
            doctorId,
            createdAt: ic.time()
        }
        bookings.insert(booking.id, booking);
        return booking;
    }
    catch(err) {
        throw new Error(`Couldn't book the session! ${err}`);
    }
}

$query;
export function getUserBookings(id: int32): Vec<Booking> {
    // Validate input field
    if(!id) {
        throw new Error(`Invalid id input field!`);
    }

    // Get the bookings made by the user 
    try {
        return bookings.values().filter((booking => booking.userId === id));
    } catch(err) {
        throw new Error(`Couldn't find users booking ${err}`);
    }
}

$query;
export function getDoctorBookings(id: int32): Vec<Booking> {
    // Validate input field
    if(!id) {
        throw new Error(`Invalid id input field!`);
    }

    // Get doctor's bookings 
    try {
        return bookings.values().filter((booking => booking.doctorId === id));
    } catch(err) {
        throw new Error(`Couldn't find users booking ${err}`);
    }
}

$update;
export function deleteBooking(id: int32): Opt<Booking> {
    // Validate id
    if(!bookings.containsKey(id)) {
        throw new Error('Id does not exist!');
    }

    try {
        return bookings.remove(id);
    } catch(err) {
        throw new Error(`Couldn't delete booking! ${err}`);
    }
}

function generateId(recordName: string): int32 {
    // Generate ids based on the last id of the record
    if(recordName === "users") {
        return Number(users.len()) + 1;
    } else if(recordName === "doctors") {
        return Number(doctors.len()) + 1;
    } else {
        return Number(bookings.len()) + 1;
    }
}
