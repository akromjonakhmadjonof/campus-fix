import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, openSync } from "node:fs";
import { homedir, networkInterfaces } from "node:os";
import { dirname, join, delimiter } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const mobile = join(root, "mobile");
const [command = "start", ...args] = process.argv.slice(2);
const sdk = process.env.ANDROID_HOME ?? join(homedir(), "Library/Android/sdk");
const java = spawnSync("/usr/libexec/java_home", ["-v", "17"], { encoding: "utf8" });
const env = {
  ...process.env,
  APP_VARIANT: "development",
  NODE_BINARY: process.execPath,
  ANDROID_HOME: sdk,
  ANDROID_SDK_ROOT: sdk,
  ...(java.status === 0 ? { JAVA_HOME: java.stdout.trim() } : {}),
  PATH: [
    dirname(process.execPath),
    ...(java.status === 0 ? [join(java.stdout.trim(), "bin")] : []),
    join(sdk, "platform-tools"),
    join(sdk, "emulator"),
    process.env.PATH,
  ].join(delimiter),
};

function run(binary, parameters, options = {}) {
  const result = spawnSync(binary, parameters, { cwd: mobile, env, stdio: "inherit", ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${binary} exited with status ${result.status}`);
  return result;
}

function lanUrl() {
  const interfaces = networkInterfaces();
  const address =
    process.env.MOBILE_HOST ??
    interfaces.en0?.find((item) => item.family === "IPv4" && !item.internal)?.address ??
    Object.entries(interfaces)
      .filter(([name]) => !name.startsWith("utun"))
      .flatMap(([, values]) => values ?? [])
      .find((item) => item.family === "IPv4" && !item.internal)?.address;
  if (!address)
    throw new Error("No LAN IPv4 address found. Set MOBILE_HOST to your Mac's reachable address.");
  return `http://${address}:3000`;
}

function androidDevices() {
  const result = spawnSync("adb", ["devices"], { env, encoding: "utf8" });
  if (result.error)
    throw new Error("Android platform-tools are missing. Install the Android SDK first.");
  return result.stdout.split("\n").flatMap((line) => {
    const match = line.match(/^(\S+)\s+device$/);
    return match ? [match[1]] : [];
  });
}

async function ensureAndroid() {
  if (java.status !== 0) throw new Error("Install a JDK 17 before building Android.");
  let devices = androidDevices();
  if (!devices.length) {
    const name = process.env.ANDROID_AVD ?? "CampusFix_API_37";
    const available = spawnSync("emulator", ["-list-avds"], { env, encoding: "utf8" });
    if (!available.stdout?.split("\n").includes(name))
      throw new Error(`Create the ${name} Android virtual device first.`);
    const logs = join(homedir(), "Library/Logs/CampusFix");
    mkdirSync(logs, { recursive: true });
    const output = openSync(join(logs, "emulator.log"), "a");
    const emulator = spawn("emulator", ["-avd", name, "-memory", "3072", "-no-boot-anim"], {
      env,
      detached: true,
      stdio: ["ignore", output, output],
    });
    emulator.on("error", (error) => console.error(error.message));
    emulator.unref();
    console.log(`Starting ${name}; emulator logs: ${logs}/emulator.log`);
    let booted = false;
    for (let attempt = 0; attempt < 120; attempt++) {
      await delay(1000);
      devices = androidDevices();
      if (
        devices.some(
          (serial) =>
            spawnSync("adb", ["-s", serial, "shell", "getprop", "sys.boot_completed"], {
              env,
              encoding: "utf8",
            }).stdout.trim() === "1",
        )
      ) {
        booted = true;
        break;
      }
    }
    if (!booted)
      throw new Error(
        "Emulator did not start. Check the emulator log or open Android Studio Device Manager.",
      );
  }
  for (const serial of devices) {
    run("adb", ["-s", serial, "reverse", "tcp:3000", "tcp:3000"]);
    run("adb", ["-s", serial, "reverse", "tcp:8081", "tcp:8081"]);
  }
}

try {
  if (command === "doctor") {
    console.log(`Android SDK: ${sdk}`);
    console.log(`Android JDK: ${env.JAVA_HOME ?? "missing"}`);
    let ready = true;
    for (const [binary, parameters] of [
      ["node", ["--version"]],
      ["java", ["-version"]],
      ["adb", ["devices"]],
      ["emulator", ["-list-avds"]],
      ["xcodebuild", ["-version"]],
      ["xcrun", ["simctl", "list", "devices", "booted"]],
      ["pod", ["--version"]],
      ["watchman", ["--version"]],
    ]) {
      console.log(`\n> ${binary} ${parameters.join(" ")}`);
      const result = spawnSync(binary, parameters, { env, stdio: "inherit" });
      if (result.error || result.status !== 0) {
        ready = false;
        console.log("Not ready; complete the platform setup above.");
      }
    }
    run("pnpm", ["exec", "expo", "install", "--check"]);
    if (!ready) process.exitCode = 1;
  } else if (command === "emulator" || command === "forward") {
    await ensureAndroid();
  } else {
    const phone = command === "iphone" || command === "start:phone";
    env.EXPO_PUBLIC_WEB_URL =
      process.env.EXPO_PUBLIC_WEB_URL ?? (phone ? lanUrl() : "http://localhost:3000");
    console.log(`CampusFix WebView: ${env.EXPO_PUBLIC_WEB_URL}`);
    console.log("Start web and API in another terminal with: pnpm dev");
    if (command === "android") {
      await ensureAndroid();
      run("pnpm", ["exec", "expo", "run:android", ...args]);
    } else if (command === "ios" || command === "iphone") {
      if (!existsSync("/Applications/Xcode.app/Contents/Developer"))
        throw new Error("Install Xcode from the App Store and complete its first-launch setup.");
      run("pnpm", [
        "exec",
        "expo",
        "run:ios",
        ...(phone && !args.some((arg) => arg === "--device" || arg.startsWith("--device="))
          ? ["--device"]
          : []),
        ...args,
      ]);
    } else if (command === "start" || command === "start:phone") {
      run("pnpm", ["exec", "expo", "start", "--dev-client", ...(phone ? ["--lan"] : []), ...args]);
    } else {
      throw new Error(`Unknown mobile command: ${command}`);
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
