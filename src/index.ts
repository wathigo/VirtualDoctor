import {
    $query,
    $update,
    Record,
    StableBTreeMap,
    Vec,
    nat64,
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
    createdAt: nat64;
}>;

type BookingPayload = Record<{
    userId: int32,
    doctorId: int32
}>;

const users = new StableBTreeMap<int32, User>(0, 38, 1000);
const doctors = new StableBTreeMap<int32, Doctor>(1, 38, 2440);
const bookings = new StableBTreeMap<int32, Booking>(2, 38, 4000);

$update;
export function createUser(username: string): User {
    if (!username) {
        throw new Error("No username provided!");
    }

    // Check for an existing user
    const existingUser = users.values().find((user) => user.username === username);
    if (existingUser) {
        throw new Error("Username already exists!");
    }

    // Add a new user to the users record
    try {
        const user: User = {
            id: generateId(users),
            username,
            createdAt: ic.time(),
        };
        users.insert(user.id, user);
        return user;
    } catch (err) {
        throw new Error(`Error creating a new user: ${err.message}`);
    }
}

$query;
export function getUsers(): Vec<User> {
    try {
        return users.values();
    } catch (err) {
        throw new Error(`Failed to fetch users: ${err.message}`);
    }
}

$query;
export function getUser(id: int32): Opt<User> {
    // Data input validation
    if (!id) {
        throw new Error("Invalid user id!");
    }

    try {
        return users.get(id);
    } catch (err) {
        throw new Error(`Couldn't find a user with the specified id: ${err.message}`);
    }
}

$update;
export function deleteUser(id: int32): Opt<User> {
    // Data input validation
    if (!id) {
        throw new Error("Invalid user id!");
    }

    // Delete users bookings
    try {
        bookings.values().forEach((booking) => {
            if (booking.userId === id) {
                bookings.remove(booking.id);
            }
        });
    } catch (err) {
        throw new Error(`Couldn't delete user's bookings: ${err.message}`);
    }

    try {
        return users.remove(id);
    } catch (err) {
        throw new Error(`Couldn't delete user: ${err.message}`);
    }
}

$update;
export function createDoctor(username: string): Doctor {
    // Input validation for username
    if (!username) {
        throw new Error("Username field required!");
    }

    // Check for an existing doctor
    const existingDoctor = doctors.values().find((doc) => doc.username === username);
    if (existingDoctor) {
        throw new Error("Username already exists!");
    }

    // Create a new doctor record and insert it into doctors tree.
    try {
        const doctor: Doctor = {
            id: generateId(doctors),
            username,
            createdAt: ic.time(),
        };
        doctors.insert(doctor.id, doctor);
        return doctor;
    } catch (err) {
        throw new Error(`Couldn't add a new doctor record: ${err.message}`);
    }
}

$query;
export function getDoctors(): Vec<Doctor> {
    try {
        return doctors.values();
    } catch (err) {
        throw new Error(`Error fetching doctors: ${err.message}`);
    }
}

$query;
export function getDoctor(id: int32): Opt<Doctor> {
    // Validate input field
    if (!id) {
        throw new Error("Invalid id field");
    }

    try {
        return doctors.get(id);
    } catch (err) {
        throw new Error(`Error fetching doctor: ${err.message}`);
    }
}

$update;
export function deleteDoctor(id: int32): Opt<Doctor> {
    // Validate input field
    if (!id) {
        throw new Error("Invalid id input field");
    }

    // Delete bookings made to the doctor
    try {
        bookings.values().forEach((booking) => {
            if (booking.doctorId === id) {
                bookings.remove(booking.id);
            }
        });
    } catch (err) {
        throw new Error(`Couldn't delete bookings made to the doctor: ${err.message}`);
    }

    try {
        return doctors.remove(id);
    } catch (err) {
        throw new Error(`Couldn't delete doctor: ${err.message}`);
    }
}

$update;
export function createBooking(payload: BookingPayload): Booking {
    // Validate input fields
    const { userId, doctorId } = payload;
    if (!userId || !doctorId) {
        throw new Error("Invalid input fields");
    }

    // Validate user and doctor existing records
    if (!users.containsKey(userId) || !doctors.containsKey(doctorId)) {
        throw new Error("User or doctor with the given Id does not exist");
    }

    // Check for existing booking
    const existingBooking = bookings.values().find(
        (booking) => booking.userId === userId && booking.doctorId === doctorId
    );
    if (existingBooking) {
        throw new Error("A session has already been booked!");
    }

    // Create a new booking record
    try {
        const booking: Booking = {
            id: generateId(bookings),
            userId,
            doctorId,
            createdAt: ic.time(),
        };
        bookings.insert(booking.id, booking);
        return booking;
    } catch (err) {
        throw new Error(`Couldn't book the session: ${err.message}`);
    }
}

$query;
export function getUserBookings(id: int32): Vec<Booking> {
    // Validate input field
    if (!id) {
        throw new Error("Invalid id input field!");
    }

    // Get the bookings made by the user
    try {
        return bookings.values().filter((booking) => booking.userId === id);
    } catch (err) {
        throw new Error(`Couldn't find user's bookings: ${err.message}`);
    }
}

$query;
export function getDoctorBookings(id: int32): Vec<Booking> {
    // Validate input field
    if (!id) {
        throw new Error("Invalid id input field!");
    }

    // Get doctor's bookings
    try {
        return bookings.values().filter((booking) => booking.doctorId === id);
    } catch (err) {
        throw new Error(`Couldn't find doctor's bookings: ${err.message}`);
    }
}

$update;
export function deleteBooking(id: int32): Opt<Booking> {
    // Validate id input field
    if (!id) {
        throw new Error("Invalid input field!");
    }

    try {
        return bookings.remove(id);
    } catch (
    try {
        return bookings.remove(id);
    } catch (err) {
        throw new Error(`Couldn't delete booking: ${err.message}`);
    }
}

function generateId(collection: StableBTreeMap<any, any>): int32 {
    // Generate ids based on the last id of the collection
    const values = collection.values();
    return values.length > 0 ? values[values.length - 1].id + 1 : 1;
}
