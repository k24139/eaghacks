package net.lax1dude.eaglercraft.v1_8.internal;

/**
 * Desktop/common no-op side of the EaglerHacks bridge. The TeaVM target shadows
 * this class by FQN and publishes the same data to JavaScript.
 */
public final class PlatformMeteorBridge {


    public static void announce() {}
    public static void publishScreen(String name, boolean overlay) {}
    public static void restrictCommandsToCleanup() {}
    public static void publishBiome(String biome) {}
    public static void publishEffect(String name, int amplifier, int duration) {}
    public static void publishCrosshair(boolean hidden) {}
    public static int takeHideCrosshair() { return -1; }
    public static void publishContext(boolean local, boolean paused, double brightness, double fov, boolean noHurtCamera) {}
    public static void publishPlayerExtra(boolean sprinting, boolean sneaking, int hurtTime, double fallDistance, float forward, float strafe, boolean dead, boolean usingItem) {}
    public static void publishEntityExtra(String type, double vx, double vy, double vz, boolean dead) {}
    public static boolean takeSwing() { return false; }
    public static boolean takeRespawn() { return false; }
    public static double takeBrightness() { return Double.NaN; }
    public static double takeFov() { return Double.NaN; }
    public static int takeNoHurtCamera() { return -1; }

    private PlatformMeteorBridge() {
    }

    public static void clear() {
    }

    public static void beginFrame(long tick, long gameTime, String dimension, int selfEntityId, int crosshairEntityId) {
    }

    public static void publishCamera(double x, double y, double z,
            float m00, float m01, float m02, float m03,
            float m10, float m11, float m12, float m13,
            float m20, float m21, float m22, float m23,
            float m30, float m31, float m32, float m33) {}

    public static void publishPlayer(double x, double y, double z, float yaw, float pitch,
            float health, float maxHealth, int hunger, boolean onGround,
            double vx, double vy, double vz, int selectedSlot, String name) {
    }

    public static void publishInventoryItem(boolean armor, int slot, String id, String name, int count,
            int durability, int maxDurability, boolean food, int nutrition, float saturation) {
    }

    public static void publishEntity(int id, String name, double x, double y, double z,
            float width, float height, float health, float maxHealth,
            boolean player, boolean hostile, boolean passive, boolean invisible, boolean visible) {
    }

    public static void endFrame() {
    }

    public static int takeAttackEntityId() { return -1; }
    public static int takeUseItem() { return 0; }
    public static int takeSelectSlot() { return -1; }
    public static int takeSprinting() { return -1; }
    public static int takeSneaking() { return -1; }
    public static boolean takeJump() { return false; }
    public static boolean hasRotation() { return false; }
    public static double takeRotationYaw() { return 0.0; }
    public static double takeRotationPitch() { return 0.0; }
    public static boolean hasVelocity() { return false; }
    public static double takeVelocityX() { return 0.0; }
    public static double takeVelocityY() { return 0.0; }
    public static double takeVelocityZ() { return 0.0; }
}
