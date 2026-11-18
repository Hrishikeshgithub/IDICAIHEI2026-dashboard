const FIRST = ["Aarav", "Vivaan", "Ananya", "Diya", "Rohan", "Isha", "Kabir", "Meera", "Arjun", "Saanvi", "Neil", "Priya", "Rahul", "Sneha", "Aditya", "Kavya", "Manish", "Pooja", "Siddharth", "Tanvi", "Omar", "Fatima", "Lena", "Daniel", "Chen", "Aisha", "Ravi", "Nisha", "Karan", "Divya"];
const LAST = ["Sharma", "Patel", "Deshmukh", "Kulkarni", "Reddy", "Iyer", "Nair", "Gupta", "Mehta", "Joshi", "Singh", "Khan", "Verma", "Rao", "Banerjee", "Menon", "Shah", "Pillai", "Bose", "Kapoor"];

let counter = 0;

/** Plausible, clearly fictional attendee. Emails use a reserved example domain. */
export function fakePerson(): { name: string; email: string } {
  const f = FIRST[Math.floor(Math.random() * FIRST.length)];
  const l = LAST[Math.floor(Math.random() * LAST.length)];
  counter += 1;
  return { name: `${f} ${l}`, email: `${f}.${l}.${Date.now().toString(36)}${counter}@attendee.example.org`.toLowerCase() };
}
