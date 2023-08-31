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
  Principal
} from "azle";

type User = Record<{
  id: int32;
  username: string;
  owner: Principal; // Add owner field
  createdAt: nat64;
}>;

type Doctor = Record<{
  id: int32;
  username: string;
  owner: Principal; // Add owner field
  createdAt: nat64;
}>;

type Booking = Record<{
  id: int32;
  userId: int32;
  doctorId: int32;
  createdAt: nat64;
}>;

type BookingPayload = Record<{
  userId: int32;
  doctorId: int32;
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
  const caller = ic.provisional_create_canister({ controller: ic.caller() });
  const newUser: User = {
    id: generateId("users"),
    username,
    owner: caller,
    createdAt: ic.time(),
  };
  users.insert(newUser.id, newUser);
  return newUser;
}

$query;
export function getUsers(): Vec<User> {
  return users.values();
}

$query;
export function getUser(id: int32): Opt<User> {
  if (!id) {
    throw new Error("Invalid user id!");
  }
  return users.get(id);
}

$update;
export function deleteUser(id: int32): Opt<User> {
  if (!id) {
    throw new Error("Invalid user id!");
  }

  // Delete users bookings
  bookings.values().forEach((booking) => {
    if (booking.userId === id) {
      bookings.remove(booking.id);
    }
  });

  return users.remove(id);
}

$update;
export function createDoctor(username: string): Doctor {
  if (!username) {
    throw new Error("Username field required!");
  }

  // Check for an existing doctor
  const existingDoctor = doctors.values().find((doc) => doc.username === username);
  if (existingDoctor) {
    throw new Error("Username already exists!");
  }

  // Create new doctor record and insert into doctors tree.
  const caller = ic.provisional_create_canister({ controller: ic.caller() });
  const newDoctor: Doctor = {
    id: generateId("doctors"),
    username,
    owner: caller,
    createdAt: ic.time(),
  };
  doctors.insert(newDoctor.id, newDoctor);
  return newDoctor;
}

$query;
export function getDoctors(): Vec<Doctor> {
  return doctors.values();
}

$query;
export function getDoctor(id: int32): Opt<Doctor> {
  if (!id) {
    throw new Error("Invalid id field");
  }
  return doctors.get(id);
}

$update;
export function deleteDoctor(id: int32): Opt<Doctor> {
  if (!id) {
    throw new Error("Invalid id input field");
  }

  // Delete bookings made to the doctor
  bookings.values().forEach((booking) => {
    if (booking.doctorId === id) {
      bookings.remove(booking.id);
    }
  });

  return doctors.remove(id);
}

$update;
export function createBooking(payload: BookingPayload): Booking {
  const { userId, doctorId } = payload;
  if (!userId || !doctorId) {
    throw new Error("Invalid input fields");
  }

  // Validate user and doctor existing records
  const userExists = users.containsKey(userId);
  const doctorExists = doctors.containsKey(doctorId);
  if (!doctorExists || !userExists) {
    throw new Error("User or doctor with the given Id does not exist");
  }

  // Check for an existing booking
  const existingBooking = bookings.values().find(
    (booking) => booking.userId === userId && booking.doctorId === doctorId
  );
  if (existingBooking) {
    throw new Error("A session has already been booked!");
  }

  // Create new booking record
  const newBooking: Booking = {
    id: generateId("bookings"),
    userId,
    doctorId,
    createdAt: ic.time(),
  };
  bookings.insert(newBooking.id, newBooking);
  return newBooking;
}

$query;
export function getUserBookings(id: int32): Vec<Booking> {
  if (!id) {
    throw new Error("Invalid id input field!");
  }
  return bookings.values().filter((booking) => booking.userId === id);
}

$query;
export function getDoctorBookings(id: int32): Vec<Booking> {
  if (!id) {
    throw new Error("Invalid id input field!");
  }
  return bookings.values().filter((booking) => booking.doctorId === id);
}

$update;
export function deleteBooking(id: int32): Opt<Booking> {
  if (!id) {
    throw new Error("Invalid input field!");
  }
  return bookings.remove(id);
}

function generateId(recordName: string): int32 {
  if (recordName === "users") {
    return users.isEmpty() ? 1 : users.values().slice(-1)[0].id + 1;
  } else if (recordName === "doctors") {
    return doctors.isEmpty() ? 1 : doctors.values().slice(-1)[0].id + 1;
  } else {
    return bookings.isEmpty() ? 1 : bookings.values().slice(-1)[0].id + 1;
  }
}
