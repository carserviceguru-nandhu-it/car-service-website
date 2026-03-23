import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

const getSupabase = () => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim();
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl) {
    throw new Error("Supabase URL is missing. Please add VITE_SUPABASE_URL to Secrets.");
  }
  if (!supabaseServiceKey) {
    throw new Error("Supabase Service Role Key is missing. Please add SUPABASE_SERVICE_ROLE_KEY to Secrets.");
  }

  // Basic validation of key format
  if (!supabaseServiceKey.startsWith('eyJ')) {
    throw new Error("The SUPABASE_SERVICE_ROLE_KEY looks incorrect. It should be a long string starting with 'eyJ'. Please make sure you copied the 'service_role' key.");
  }

  return createClient(supabaseUrl, supabaseServiceKey);
};

const sendBookingNotification = async (details: any) => {
  const { customerName, phone, email, carBrand, carModel, bookingTime, totalPrice, location } = details;

  // Ensure we have a password before trying
  if (!process.env.EMAIL_APP_PASSWORD) {
    console.warn("Skipping email notification: EMAIL_APP_PASSWORD is not set in environment variables.");
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'carserviceguru@gmail.com',
      pass: process.env.EMAIL_APP_PASSWORD
    }
  });

  const mailOptions = {
    from: '"Car Service Guru" <carserviceguru@gmail.com>',
    to: 'carserviceguru@gmail.com',
    subject: `🚗 New Booking Alert: ${customerName}`,
    text: `
      🚀 New Booking Received!
      
      Customer Details:
      ----------------
      Name: ${customerName}
      Phone: ${phone}
      Email: ${email || 'N/A'}
      
      Vehicle Details:
      ---------------
      Car: ${carBrand} ${carModel}
      
      Service Details:
      ---------------
      Total Price: ₹${totalPrice}
      Date/Time: ${bookingTime}
      Location: ${location || 'Not provided'}
      
      Please log in to the admin dashboard to manage this booking.
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Booking notification sent to owner email!");
  } catch (error) {
    console.error("Error sending notification email:", error);
  }
};

const sendWhatsAppNotification = async (details: any) => {
  const { customerName, phone, carBrand, carModel, totalPrice } = details;
  const apiKey = process.env.WHATSAPP_API_KEY;
  const myPhone = "+919751969009";

  if (!apiKey) {
    console.warn("Skipping WhatsApp notification: WHATSAPP_API_KEY is not set.");
    return;
  }

  // Format message for URL (spaces replaced by %20 or +, newlines by %0A)
  const messageText = `🚗 *New Booking Received!*%0A%0A*Customer:* ${customerName}%0A*Phone:* ${phone}%0A*Vehicle:* ${carBrand} ${carModel}%0A*Total Price:* ₹${totalPrice}%0A%0A_Check your admin panel for full details._`;

  const url = `https://api.callmebot.com/whatsapp.php?phone=${myPhone}&text=${messageText}&apikey=${apiKey}`;

  try {
    const response = await fetch(url);
    if (response.ok) {
      console.log("WhatsApp notification sent successfully!");
    } else {
      console.error("WhatsApp API returned an error:", await response.text());
    }
  } catch (error) {
    console.error("Error sending WhatsApp notification:", error);
  }
};

const sendSMSNotification = async (details: any) => {
  const { customerName, phone, carBrand, carModel, totalPrice } = details;
  const apiKey = process.env.FAST2SMS_API_KEY;
  const myPhone = "9751969009";

  if (!apiKey) {
    console.warn("Skipping SMS notification: FAST2SMS_API_KEY is not set.");
    return;
  }

  try {
    const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
      method: 'POST',
      headers: {
        "authorization": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "route": "q",
        "message": `New Booking Alert!\nCustomer: ${customerName}\nPhone: ${phone}\nCar: ${carBrand} ${carModel}\nPrice: ₹${totalPrice}`,
        "language": "english",
        "flash": 0,
        "numbers": myPhone
      })
    });

    const result = await response.json();
    if (result.return) {
      console.log("SMS notification sent successfully via Fast2SMS!");
    } else {
      console.error("Fast2SMS API error:", result.message);
    }
  } catch (error) {
    console.error("Error sending SMS notification:", error);
  }
};

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok", env: {
      hasUrl: !!process.env.VITE_SUPABASE_URL,
      hasAnon: !!process.env.VITE_SUPABASE_ANON_KEY,
      hasService: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    }
  });
});

const getOrCreateUser = async (supabase: any, { name, phone, email }: { name: string, phone: string, email?: string }) => {
  console.log(`getOrCreateUser: ${name}, ${phone}, ${email}`);

  // Normalize phone for database: digits only + country code 91 if 10 digits
  const digitsOnlyStr = phone.replace(/\D/g, '');
  const profilePhone = digitsOnlyStr.length === 10 ? '91' + digitsOnlyStr : digitsOnlyStr;

  // 1. Check if profile exists using original or normalized phone
  let { data: existingProfile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .or(`phone.eq.${phone},phone.eq.${profilePhone}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (existingProfile) {
    console.log("Found existing profile:", existingProfile.id);
    if (!existingProfile.role) {
      await supabase.from("profiles").update({ role: 'customer' }).eq("id", existingProfile.id);
      existingProfile.role = 'customer';
    }
    return existingProfile;
  }

  // Try finding by email if it exists
  if (email) {
    const { data: profileByEmail } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", email)
      .single();
    if (profileByEmail) {
      console.log("Found existing profile by email:", profileByEmail.id);
      return profileByEmail;
    }
  }

  // 2. Profile doesn't exist, check Auth
  let authId: string | null = null;
  // Format phone to E.164 constraint (Assuming India +91 if 10 digits) for Supabase Auth
  let formattedPhoneAuth = phone;
  if (digitsOnlyStr.length === 10) {
    formattedPhoneAuth = `+91${digitsOnlyStr}`;
  } else if (!phone.startsWith('+')) {
    formattedPhoneAuth = `+${digitsOnlyStr}`;
  }

  const authEmail = email || `${digitsOnlyStr}@carserviceguru.com`;

  console.log(`Attempting to create Auth User with email: ${authEmail}, phone: ${formattedPhoneAuth}`);

  // First, try to fetch users to see if they exist before creating
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (!listError) {
    const existingAuthUser = users.find((u: any) =>
      u.phone === formattedPhoneAuth ||
      u.phone === phone ||
      (u.email && authEmail && u.email.toLowerCase() === authEmail.toLowerCase())
    );
    if (existingAuthUser) {
      authId = existingAuthUser.id;
      console.log("Found existing Auth user ID in listUsers:", authId);
    }
  }

  if (!authId) {
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: authEmail,
      phone: formattedPhoneAuth,
      password: crypto.randomBytes(16).toString('hex'),
      email_confirm: true,
      phone_confirm: true,
      user_metadata: { name, phone }
    });

    if (authError) {
      console.log("Auth creation error:", authError.message);
      // If phone format is invalid, try creating with just email
      if (authError.message.includes("phone")) {
        console.log("Retrying creation without phone...");
        const { data: fallbackAuth, error: fallbackError } = await supabase.auth.admin.createUser({
          email: authEmail,
          password: crypto.randomBytes(16).toString('hex'),
          email_confirm: true,
          user_metadata: { name, phone }
        });

        if (!fallbackError && fallbackAuth?.user) {
          authId = fallbackAuth.user.id;
          console.log("Created fallback Auth user ID without phone:", authId);
        } else {
          console.error("Fallback auth creation failed:", fallbackError?.message);
          throw fallbackError || new Error("Failed to create user account");
        }
      } else {
        throw authError; 
      }
    } else {
      authId = authUser?.user?.id;
      console.log("Created new Auth user ID:", authId);
    }
  }

  if (!authId) {
    throw new Error("Unable to create or find authentication record for user.");
  }

  // 3. Create profile
  console.log(`Creating profile with authId: ${authId}, password: 123456, phone: ${profilePhone}`);
  const { data: newProfile, error: createError } = await supabase
    .from("profiles")
    .insert([{
      id: authId,
      name,
      phone: profilePhone,
      email,
      role: 'customer',
      password: '123456'
    }])
    .select()
    .single();

  if (createError) {
    console.error("Profile creation error:", createError);
    // If it's a conflict, try to fetch it one last time
    if (createError.code === '23505') {
      const { data: lastTry } = await supabase.from("profiles").select("*").eq("phone", profilePhone).single();
      return lastTry;
    }
    throw createError;
  }

  return newProfile;
};

// API routes
app.get("/api/services", async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;
    res.json({ success: true, services: data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/bookings", async (req, res) => {
  console.log("--- START BOOKING PROCESS ---");
  try {
    const supabase = getSupabase();
    const { customerName, phone, email, carBrand, carModel, services, location, bookingTime, userId, totalPrice } = req.body;

    console.log("Incoming booking request payload:", {
      customerName,
      phone,
      email,
      carBrand,
      carModel,
      servicesCount: services?.length,
      location,
      bookingTime,
      userId,
      totalPrice
    });

    if (!phone) {
      console.error("Missing phone number in request");
      return res.status(400).json({ success: false, error: "Phone number is required" });
    }

    // 1. Ensure user exists in profiles or create
    const userProfile = await getOrCreateUser(supabase, {
      name: customerName,
      phone,
      email
    });

    const currentUserId = userProfile.id;
    console.log("User profile determined:", currentUserId);

    // Update profile address if location is provided
    if (location) {
      try {
        await supabase
          .from("profiles")
          .update({ address: location })
          .eq("id", currentUserId);
      } catch (e) {
        console.warn("Failed to update profile address, continuing with booking:", e);
      }
    }

    // 1.8 Handle Vehicle
    let vehicleId = null;
    try {
      if (currentUserId && carBrand && carModel) {
        console.log("Handling vehicle for user:", currentUserId);
        // Check if vehicle exists (case insensitive check would be better but Supabase .eq is sensitive)
        // We'll try to find any vehicle for this user if brand/model matches
        const { data: vehicles } = await supabase
          .from("vehicles")
          .select("id, brand, model")
          .eq("user_id", currentUserId);

        const existingVehicle = vehicles?.find((v: any) =>
          v.brand.toLowerCase() === carBrand.toLowerCase() &&
          v.model.toLowerCase() === carModel.toLowerCase()
        );

        if (existingVehicle) {
          vehicleId = existingVehicle.id;
          console.log("Found existing vehicle:", vehicleId);
        } else {
          console.log("Creating new vehicle record...");
          const { data: newVehicle, error: vError } = await supabase
            .from("vehicles")
            .insert([{
              user_id: currentUserId,
              brand: carBrand,
              model: carModel
            }])
            .select()
            .single();

          if (!vError && newVehicle) {
            vehicleId = newVehicle.id;
            console.log("New vehicle created:", vehicleId);
          } else {
            console.warn("Vehicle creation failed, proceeding without vehicle_id:", vError?.message);
            // If it failed, maybe we can just use the first vehicle found for this user as a fallback?
            if (vehicles && vehicles.length > 0) {
              vehicleId = vehicles[0].id;
              console.log("Using first available vehicle as fallback:", vehicleId);
            }
          }
        }
      }
    } catch (e) {
      console.warn("Vehicle handling failed, continuing with booking:", e);
    }

    console.log("Preparing booking payload for user:", currentUserId);

    const tryBookingInsert = async (payload: any) => {
      console.log("Attempting insert with payload:", JSON.stringify(payload));
      return await supabase.from("bookings").insert([payload]).select();
    };

    // Define possible column names for different versions of the schema
    const timeCols = ["booking_time", "booking_date", "scheduled_at", "date", "time"];
    const priceCols = ["total_price", "price", "amount", "total_cost", "cost"];
    const brandCols = ["car_brand", "brand", "carBrand", "vehicle_brand"];
    const modelCols = ["car_model", "model", "carModel", "vehicle_model"];
    const userCols = ["user_id", "userId", "customer_id", "profile_id"];
    const locationCols = ["location", "address", "service_location", "pickup_location"];
    const servicesCols = ["services", "service_list", "items", "selected_services"];

    let bookingData = null;
    let bookingError = null;

    // Strategy: Try the most likely combination first, then fallback to others if it fails with "column not found"
    const primaryPayload: any = {
      status: "pending",
      user_id: currentUserId,
      total_cost: totalPrice || 0,
      scheduled_date: bookingTime ? bookingTime.split('T')[0] : null,
      scheduled_time: bookingTime ? bookingTime.split('T')[1]?.substring(0, 5) : null
    };

    if (vehicleId) primaryPayload.vehicle_id = vehicleId;
    if (location) primaryPayload.location = location; // Fallback if location column exists

    const result = await tryBookingInsert(primaryPayload);
    bookingData = result.data;
    bookingError = result.error;

    if (bookingError && (bookingError.code === '42703' || bookingError.message.includes("column"))) {
      console.log("Primary insert failed due to column mismatch, entering recovery mode...");

      // Recovery mode: Try to find which columns exist by doing a minimal select
      try {
        const { data: sample } = await supabase.from("bookings").select("*").limit(1);
        if (sample && sample.length > 0) {
          const keys = Object.keys(sample[0]);
          console.log("Available columns in bookings table:", keys);

          const findKey = (possibilities: string[]) => possibilities.find(p => keys.includes(p));

          const recoveryPayload: any = { status: "pending" };

          const tCol = findKey(timeCols);
          const pCol = findKey(priceCols);
          const bCol = findKey(brandCols);
          const mCol = findKey(modelCols);
          const uCol = findKey(userCols);
          const lCol = findKey(locationCols);
          const sCol = findKey(servicesCols);

          if (tCol) recoveryPayload[tCol] = bookingTime;
          if (pCol) recoveryPayload[pCol] = totalPrice || 0;
          if (bCol) recoveryPayload[bCol] = carBrand;
          if (mCol) recoveryPayload[mCol] = carModel;
          if (uCol) recoveryPayload[uCol] = currentUserId;
          if (lCol) recoveryPayload[lCol] = location || "Not specified";
          if (sCol) recoveryPayload[sCol] = services || [];
          if (keys.includes("vehicle_id") && vehicleId) recoveryPayload.vehicle_id = vehicleId;

          const recoveryResult = await tryBookingInsert(recoveryPayload);
          if (!recoveryResult.error) {
            bookingData = recoveryResult.data;
            bookingError = null;
          } else {
            bookingError = recoveryResult.error;
          }
        }
      } catch (e) {
        console.error("Recovery mode failed:", e);
      }
    }

    if (bookingError) {
      throw bookingError;
    }

    const savedBooking = bookingData?.[0];

    // 1.9 Insert into booking_services table
    if (savedBooking && services && Array.isArray(services)) {
      try {
        const serviceInserts = services.map(sId => ({
          booking_id: savedBooking.id,
          service_id: sId
        }));

        const { error: sError } = await supabase
          .from("booking_services")
          .insert(serviceInserts);

        if (sError) {
          console.warn("Failed to insert into booking_services, table might not exist yet:", sError.message);
        } else {
          console.log("Inserted services into booking_services table");
        }
      } catch (e) {
        console.warn("booking_services insert failed:", e);
      }
    }

    console.log("Booking saved successfully:", savedBooking?.id);

    // Trigger owner notification
    sendBookingNotification({
      customerName,
      phone,
      email,
      carBrand,
      carModel,
      bookingTime,
      totalPrice,
      location
    }).catch(err => console.error("Notification trigger failed:", err));

    // Trigger WhatsApp notification
    sendWhatsAppNotification({
      customerName,
      phone,
      carBrand,
      carModel,
      totalPrice
    }).catch(err => console.error("WhatsApp trigger failed:", err));

    // Trigger SMS notification
    sendSMSNotification({
      customerName,
      phone,
      carBrand,
      carModel,
      totalPrice
    }).catch(err => console.error("SMS trigger failed:", err));

    console.log("--- END BOOKING PROCESS (SUCCESS) ---");
    res.json({ success: true, booking: savedBooking });
  } catch (error: any) {
    console.error("CRITICAL BOOKING ERROR:", error);
    console.log("--- END BOOKING PROCESS (FAILURE) ---");
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.details || "No additional details"
    });
  }
});

app.get("/api/bookings/:id/with-services", async (req, res) => {
  try {
    const supabase = getSupabase();
    const { id } = req.params;

    // Fetch booking
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", id)
      .single();

    if (bookingError || !booking) {
      return res.status(404).json({ success: false, error: "Booking not found" });
    }

    // Fetch associated services
    const { data: bookingServices, error: servicesError } = await supabase
      .from("booking_services")
      .select("service_id, services(id, name, price)")
      .eq("booking_id", id);

    if (servicesError) {
      console.warn("Error fetching booking services:", servicesError.message);
    }

    // Extract service details
    const services = (bookingServices || []).map((bs: any) => ({
      id: bs.service_id,
      name: bs.services?.name || 'Service',
      price: bs.services?.price || 0
    }));

    res.json({
      success: true,
      booking: {
        ...booking,
        services
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/bookings/:id/cancel", async (req, res) => {
  try {
    const supabase = getSupabase();
    const { id } = req.params;
    const { userId } = req.body;

    // Check if booking exists and if garage is assigned
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;
    if (!booking) return res.status(404).json({ success: false, error: "Booking not found" });

    // Check ownership
    if (booking.user_id !== userId) {
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    // Check if garage is assigned (garage_id is not null)
    if (booking.garage_id) {
      return res.status(400).json({ success: false, error: "Cannot cancel booking after garage is assigned" });
    }

    console.log("Cancelling booking", id);
    const { data: before, error: fetchBefore } = await supabase
      .from("bookings")
      .select("id,status")
      .eq("id", id)
      .single();
    console.log("Before cancel row", before, "fetch error", fetchBefore);

    const updatePayload: any = { status: "cancelled" };
    if ('service_status' in booking) {
      updatePayload.service_status = "cancelled";
    }

    console.log("Payload for cancel:", updatePayload);

    const { data: updated, error: updateError } = await supabase
      .from("bookings")
      .update(updatePayload)
      .eq("id", id)
      .select();

    console.log("Update result", updated, "error", updateError);
    if (updateError) throw updateError;

    res.json({ success: true, message: "Booking cancelled successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const supabase = getSupabase();
    const { name, phone, email } = req.body;

    const userProfile = await getOrCreateUser(supabase, { name, phone, email });
    res.json({ success: true, user: userProfile });
  } catch (error: any) {
    console.error("Login API error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/user-history/:phone", async (req, res) => {
  try {
    const supabase = getSupabase();
    const { phone } = req.params;
    const { data: user, error: userError } = await supabase
      .from("profiles")
      .select("*, bookings(*, booking_services(services(name)))")
      .eq("phone", phone)
      .single();

    if (userError && userError.code !== "PGRST116") throw userError;

    // Normalize bookings if they exist
    if (user && user.bookings) {
      user.bookings = user.bookings.map((b: any) => {
        // Map any date column to booking_time
        const dateVal = b.booking_time || b.booking_date || b.scheduled_at || b.date || b.created_at;
        const priceVal = b.total_price || b.price || b.amount;
        return { ...b, booking_time: dateVal, total_price: priceVal };
      });
    }

    res.json({ success: true, user });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Global error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Global server error:", err);
  res.status(500).json({ success: false, error: err.message });
});

// Vite middleware for development (Only run if it's NOT Vercel serverless)
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  import('vite').then(({ createServer: createViteServer }) => {
    createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    }).then(vite => {
      app.use(vite.middlewares);
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Development Server running on http://0.0.0.0:${PORT}`);
      });
    });
  }).catch(err => {
    console.error("Failed to start Vite dev server:", err);
  });
} else if (!process.env.VERCEL) {
  app.use(express.static("dist"));
  app.get("*", (req, res) => {
    res.sendFile("dist/index.html", { root: "." });
  });
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Production Server running on http://0.0.0.0:${PORT}`);
  });
}

// Export the Express App so Vercel can run it as a Serverless Function
export default app;
