import { Nat64 } from "@dfinity/candid/lib/cjs/idl";
import {
    $query,
    $update,
    Record,
    StableBTreeMap,
    Vec,
    nat64,
    nat32,
    ic, 
    Opt,
    int32
} from "azle"; 

type User = Record<{
    id: int32;
    username: string;
    createdAt: nat64;
}>;

type Doctor = Record<{
    id: int32;
    username: string;
    createdAt: nat64;
}>;

type Booking = Record<{
    id: int32;
    userId: int32;
    doctorId: int32;
    startAt: nat32;
    endAt: nat32;
    createdAt: nat64;
}>;

type BookingPayload = Record<{
    userId: int32,
    doctorId: int32
    startAt: string;
    endAt: string;
}>;

const users = new StableBTreeMap<int32, User>(0, 38, 1000);
const doctors = new StableBTreeMap<int32, Doctor>(1, 38, 2440);
const bookings = new StableBTreeMap<int32, Booking>(2, 38, 4000);

$update;
export function createUser(username: string): User{
    if(!username) {
        throw new Error("No username provided!");
    }

    // Check for an existing user
    const checkUser = users.values().find((user => user.username === username));
    if(checkUser) {
        throw new Error("Username already exist!");
    }

    // Add a new user to the users record
    try {
        const user: User = {
            id: generateId(users),
            username,
            createdAt: ic.time()
        }
        users.insert(user.id, user);
        return user;
    } catch(err) {
        throw new Error(`Error creating a new user ${err}`);
    }
}

$query
export function getUsers(): Vec<User> {
    try {
        return users.values();
    } catch (err) {
        throw new Error(`Failed to fetch users${err}`);
    };
}

$query;
export function getUser(id: int32): Opt<User> {
    // Data input validation
    if(!id) {
        throw new Error("Invalid user id!");
    }

    try {
        return users.get(id);
    } catch (err) {
        throw (`Couldn't find a user with the specified id ${err}`);
    }
}

$update;
export function deleteUser(id: int32): Opt<User> {
    // Data input validation
    if(!id) {
        throw new Error("Invalid user id!");
    }

    // Delete users bookings
    try {
        bookings.values().forEach((booking => {
            if (booking.userId === id) {
                bookings.remove(booking.id);
            }
        }))
    } catch(err) {
        throw new Error(`Couldn't delete users bookings`);
    }

    try {
        return users.remove(id);
    } catch (err) {
        throw `Couln't delete user ${err}`;
    }
}

$update;
export function createDoctor(username: string): Doctor {
    // Input validation for username
    if(!username) {
        throw new Error(`Username field required!`);
    }

    // Check for an existing doctor
    const checkDoctor = doctors.values().find((doc => doc.username === username));
    if(checkDoctor) {
        throw new Error("Username already exist!");
    }

    // Create new doctor record and insert into doctors tree.
    try {
        const doctor: Doctor = {
            id: generateId(doctors),
            username,
            createdAt: ic.time()
        };
        doctors.insert(doctor.id, doctor);
        return doctor;
    } catch(err) {
        throw new Error(`Couldn't add a new doctor record ${err}`);
    }
}

$query;
export function getDoctors(): Vec<Doctor> {
    try {
        return doctors.values();
    } catch(err) {
        throw new Error(`Error fetching doctors ${err}`);
    }
}

$query;
export function getDoctor(id: int32): Opt<Doctor> {
    // validate input field
    if(!id) {
        throw new Error("Invalid id field")
    }

    try {
        return doctors.get(id);
    } catch(err) {
        throw new Error(`Error fetching doctor ${err}`)
    }
}

$update;
export function deleteDoctor(id: int32): Opt<Doctor> {
    // Validate input field
    if(!id) {
        throw new Error("Invalid id input field");
    }

    // delete bookings made to the doctor
    try {
        bookings.values().forEach((booking => {
            if (booking.doctorId === id) {
                bookings.remove(booking.id);
            }
        }));
    } catch(err) {
        throw new Error(`Couldn't delete bookings made to the doctor ${err}`);
    }

    try {
        return doctors.remove(id);
    } catch(err) {
        throw new Error(`Couldn't delete doctor ${err}`);
    }
}

$update;
export function createBooking(payload: BookingPayload): Booking {
    // validate input fields
    const { userId, doctorId, startAt, endAt} = payload;
    if(
        !userId ||
        !doctorId ||
        !startAt ||
        !endAt
        ) {
        throw new Error(`Invalid input fields`);
    }

    // Validate user and doctor existing records
    const user = users.containsKey(userId);
    const doc = doctors.containsKey(doctorId);
    if(!doc || !user) {
        throw new Error("user or doctor with the given Id does not exist");
    }

    //Date.parse() not woking in this environment
    //ic.time() feature is still work in progress
    //Azle is still in beta version 
    //Feature will be useful once the package is
    //updated with time-support feature
    //See https://demergent-labs.github.io/azle/reference/canister_apis/time.html?highlight=time#time
    //For more information

    const begin: nat32 = Number(Date.parse(startAt));
    const end: nat32 = Number(Date.parse(endAt));

    //Validate boooking period is not in the past
    if (
        begin <= Date.now() ||
        end <= Date.now() ||
        begin >= end
        ) 
        {
        throw new Error("Starting time given is in the past");
    }

    // Check for existing booking
    const checkBooking = bookings.values().find(
        (
            booking => ((booking.userId === userId || booking.doctorId === doctorId))
        ));
    if (checkBooking) {
        throw new Error("A session has already been booked!");
    }
    // Create new booking record
    try {
        const booking: Booking = {  
            id: generateId(bookings),
            userId,
            doctorId,
            startAt:  begin,
            endAt: end,
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
    // Validate id input field
    if(!id) {
        throw new Error('Invalid input field!');
    }

    try {
        return bookings.remove(id);
    } catch(err) {
        throw new Error(`Couldn't delete booking! ${err}`);
    }
}

function generateId(collection: StableBTreeMap<any, any>): int32 {
    // Generate ids based on the last id of the collection
    const values = collection.values();
    return values.length > 0 ? values[values.length - 1].id + 1 : 1;
}