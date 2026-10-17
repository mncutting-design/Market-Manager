import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function seedDatabase() {
  try {
    const marketCount = await prisma.market.count();
    if (marketCount > 0) {
      return { success: true, message: "Database already contains data.", seeded: false };
    }

    console.log("🌱 Auto-seeding Market Manager database...");

    // 1. Create or ensure Admin User
    const passwordHash = await bcrypt.hash("admin123", 10);
    await prisma.user.upsert({
      where: { email: "admin@marketmanager.com" },
      update: { passwordHash },
      create: {
        name: "প্রশাসক (Admin)",
        email: "admin@marketmanager.com",
        passwordHash,
        role: "ADMIN",
        locale: "bn",
      },
    });

    // 2. Charge Types
    const chargeTypesData = [
      { name_en: "Electricity", name_bn: "বিদ্যুৎ বিল", isRecurring: false, defaultAmount: 0 },
      { name_en: "Water Service", name_bn: "পানির বিল", isRecurring: true, defaultAmount: 50000 },
      { name_en: "Service Charge", name_bn: "সার্ভিস চার্জ", isRecurring: true, defaultAmount: 100000 },
      { name_en: "Generator Backup", name_bn: "জেনারেটর ব্যাকআপ", isRecurring: true, defaultAmount: 30000 },
    ];

    const chargeTypes = [];
    for (const ct of chargeTypesData) {
      const created = await prisma.chargeType.create({ data: ct });
      chargeTypes.push(created);
    }

    // 3. Expense Categories
    const expenseCategoriesData = [
      { name_en: "Guard Salary", name_bn: "দারোয়ান বেতন", icon: "Shield", color: "#0284c7" },
      { name_en: "Staff Salary", name_bn: "স্টাফ বেতন", icon: "Users", color: "#0d9488" },
      { name_en: "Repairing & Maintenance", name_bn: "মেরামত ও রক্ষণাবেক্ষণ", icon: "Wrench", color: "#ea580c" },
      { name_en: "Electricity Bill", name_bn: "বিদ্যুৎ বিল (সাধারণ)", icon: "Zap", color: "#eab308" },
      { name_en: "Water & Sewerage", name_bn: "পানি ও পয়ঃনিষ্কাশন", icon: "Droplets", color: "#06b6d4" },
      { name_en: "Cleaning & Sanitation", name_bn: "পরিচ্ছন্নতা খরচ", icon: "Building2", color: "#8b5cf6" },
    ];

    const categories = [];
    for (const cat of expenseCategoriesData) {
      const created = await prisma.expenseCategory.create({ data: cat });
      categories.push(created);
    }

    // 4. Markets & Shops
    const marketsData = [
      {
        name: "গুলশান প্লাজা শপিং কমপ্লেক্স (Gulshan Plaza)",
        address: "প্লট ১২, গুলশান-১ বাণিজ্যিক এলাকা, ঢাকা-১২১২",
        notes: "৩ তলা বিশিষ্ট শীতাতপ নিয়ন্ত্রিত আধুনিক শপিং মল।",
      },
      {
        name: "উত্তরা সিটি মার্কেট (Uttara City Market)",
        address: "রোড ৪, সেক্টর ৩, উত্তরা, ঢাকা-১২৩০",
        notes: "জেনারেল রিটেইল ও ক্লথিং মার্কেট।",
      },
      {
        name: "ধানমন্ডি ট্রেড সেন্টার (Dhanmondi Trade Center)",
        address: "২৭ মিরপুর রোড, ধানমন্ডি, ঢাকা-১২০৫",
        notes: "ইলেকট্রনিক্স ও গ্যাজেট সামগ্রীর মার্কেট।",
      },
    ];

    const tenantNames = [
      { name: "আব্দুল করিম", phone: "01711223344", nid: "19882691234567890" },
      { name: "মো: রফিকুল ইসলাম", phone: "01822334455", nid: "19852691234567891" },
      { name: "তানভীর আহমেদ", phone: "01933445566", nid: "19902691234567892" },
      { name: "নুরুল হক", phone: "01644556677", nid: "19782691234567893" },
      { name: "সাব্বির হোসেন", phone: "01755667788", nid: "19922691234567894" },
      { name: "মেহেদী হাসান", phone: "01866778899", nid: "19892691234567895" },
      { name: "ফারহানা আক্তার", phone: "01977889900", nid: "19942691234567896" },
      { name: "মো: জসিম উদ্দিন", phone: "01788990011", nid: "19832691234567897" },
      { name: "কামরুল ইসলাম", phone: "01899001122", nid: "19872691234567898" },
      { name: "আনিসুর রহমান", phone: "01900112233", nid: "19812691234567899" },
    ];

    let tenantCounter = 0;
    const currentMonth = 10;
    const currentYear = 2026;

    for (let mIdx = 0; mIdx < marketsData.length; mIdx++) {
      const market = await prisma.market.create({ data: marketsData[mIdx] });

      for (let sIdx = 1; sIdx <= 15; sIdx++) {
        let floor = "Ground";
        let shopNumber = `G-${String(sIdx).padStart(2, "0")}`;
        let rentBDT = 25000;

        if (sIdx > 6 && sIdx <= 12) {
          floor = "1st Floor";
          shopNumber = `1${String(sIdx - 6).padStart(2, "0")}`;
          rentBDT = 20000;
        } else if (sIdx > 12) {
          floor = "2nd Floor";
          shopNumber = `2${String(sIdx - 12).padStart(2, "0")}`;
          rentBDT = 16000;
        }

        const isOccupied = !(mIdx === 1 && sIdx === 15);
        const defaultRentPaisa = rentBDT * 100;

        const shop = await prisma.shop.create({
          data: {
            marketId: market.id,
            shopNumber,
            floor,
            size: `${180 + (sIdx % 4) * 40} sqft`,
            defaultRent: defaultRentPaisa,
            status: isOccupied ? "OCCUPIED" : "VACANT",
          },
        });

        if (isOccupied) {
          const tenantInfo = tenantNames[tenantCounter % tenantNames.length];
          tenantCounter++;

          const tenant = await prisma.tenant.create({
            data: {
              shopId: shop.id,
              name: tenantInfo.name,
              phone: tenantInfo.phone,
              nid: tenantInfo.nid,
              advanceDeposit: defaultRentPaisa * 3,
              rentAmount: defaultRentPaisa,
              startDate: new Date("2025-01-01"),
            },
          });

          // Generate current month bill
          const electricityAmount = (sIdx % 3 === 0 ? 1500 : 800) * 100;
          const serviceAmount = 1000 * 100;
          const totalAmount = defaultRentPaisa + electricityAmount + serviceAmount;

          let paidAmount = 0;
          let status = "DUE";

          if (sIdx % 4 === 0) {
            paidAmount = 0;
            status = "DUE";
          } else if (sIdx % 4 === 1) {
            paidAmount = defaultRentPaisa; // partial
            status = "PARTIAL";
          } else {
            paidAmount = totalAmount; // fully paid
            status = "PAID";
          }

          const bill = await prisma.bill.create({
            data: {
              shopId: shop.id,
              tenantId: tenant.id,
              month: currentMonth,
              year: currentYear,
              rentAmount: defaultRentPaisa,
              totalAmount,
              paidAmount,
              dueAmount: totalAmount - paidAmount,
              status,
              dueDate: new Date(currentYear, currentMonth - 1, 10),
            },
          });

          // Bill Items
          await prisma.billItem.create({
            data: {
              billId: bill.id,
              description: "Electricity Charge",
              amount: electricityAmount,
            },
          });
          await prisma.billItem.create({
            data: {
              billId: bill.id,
              description: "Service Charge",
              amount: serviceAmount,
            },
          });

          // Payment record if paid or partial
          if (paidAmount > 0) {
            await prisma.payment.create({
              data: {
                billId: bill.id,
                amount: paidAmount,
                method: sIdx % 2 === 0 ? "BKASH" : "CASH",
                reference: sIdx % 2 === 0 ? `BKASH${bill.id.slice(-6).toUpperCase()}` : null,
                receivedBy: "প্রশাসক (Admin)",
                paidOn: new Date(currentYear, currentMonth - 1, 5 + (sIdx % 5)),
              },
            });
          }
        }
      }

      // Add Sample Expenses for each market
      if (categories.length > 0) {
        await prisma.expense.create({
          data: {
            marketId: market.id,
            categoryId: categories[0].id,
            amount: 2500000, // 25,000 BDT Guard Salary
            date: new Date(currentYear, currentMonth - 1, 2),
            description: "নিরাপত্তা প্রহরী মাসিক বেতন (২ জন)",
            paymentMethod: "CASH",
          },
        });
        await prisma.expense.create({
          data: {
            marketId: market.id,
            categoryId: categories[3].id,
            amount: 1450000, // 14,500 BDT Electricity
            date: new Date(currentYear, currentMonth - 1, 6),
            description: "মার্কেট সাধারণ বিদ্যুৎ বিল পরিশোধ",
            paymentMethod: "BANK",
          },
        });
      }
    }

    console.log("✅ Auto-seeding completed successfully!");
    return { success: true, message: "Demo data seeded successfully!", seeded: true };
  } catch (error: any) {
    console.error("Auto-seed error:", error);
    return { success: false, error: error.message };
  }
}
