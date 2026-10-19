package net.lax1dude.eaglercraft.v1_8.mods.meteor;

import net.lax1dude.eaglercraft.v1_8.internal.PlatformMeteorBridge;
import net.minecraft.client.Minecraft;
import net.minecraft.client.player.LocalPlayer;
import net.minecraft.client.renderer.state.level.CameraRenderState;
import net.minecraft.core.component.DataComponents;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EquipmentSlot;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.monster.Enemy;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.food.FoodProperties;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.phys.Vec3;
import org.joml.Matrix4f;

/**
 * Narrow, explicit bridge from real 26.2 client state into the browser-side
 * Meteor framework. It publishes a bounded snapshot and consumes one-shot
 * commands on the normal client tick; no reflection or obfuscated WASM access is
 * required.
 */
public final class EaglerHacksNativeBridge {

    private static final int MAX_ENTITIES = 512;
    private static double fovOverride = Double.NaN;
    private static double savedBrightness = Double.NaN;
    private static boolean noHurtCamera;
    private static boolean hideCrosshair;
    public static float fov(float original) { return Double.isFinite(fovOverride) ? (float)fovOverride : original; }
    public static boolean noHurtCamera() { return noHurtCamera; }
    public static boolean hideCrosshair() { return hideCrosshair; }

    private EaglerHacksNativeBridge() {
    }

    public static void tick(Minecraft minecraft) {
        PlatformMeteorBridge.announce();
        PlatformMeteorBridge.publishScreen(minecraft.gui.screen() == null ? null : minecraft.gui.screen().getClass().getSimpleName(), minecraft.gui.overlay() != null);
        LocalPlayer player = minecraft.player;
        if (player == null || minecraft.level == null) {
            if (Double.isFinite(savedBrightness)) minecraft.options.gamma().set(savedBrightness);
            savedBrightness = Double.NaN; fovOverride = Double.NaN; noHurtCamera = false; hideCrosshair = false;
            PlatformMeteorBridge.clear();
            return;
        }

        Vec3 velocity = player.getDeltaMovement();
        int targetId = minecraft.crosshairPickEntity != null ? minecraft.crosshairPickEntity.getId() : -1;
        PlatformMeteorBridge.beginFrame(
                minecraft.level.getGameTime(), minecraft.level.getOverworldClockTime(),
                minecraft.level.dimension().identifier().toString(), player.getId(), targetId);

        PlatformMeteorBridge.publishContext(minecraft.isLocalServer(), minecraft.gui.screen() != null || minecraft.gui.overlay() != null,
                minecraft.options.gamma().get(), fov(minecraft.options.fov().get()), noHurtCamera);
        PlatformMeteorBridge.publishCrosshair(hideCrosshair);
        PlatformMeteorBridge.publishBiome(minecraft.level.getBiome(player.blockPosition()).getRegisteredName());
        CameraRenderState cameraState = minecraft.gameRenderer.gameRenderState().levelRenderState.cameraRenderState;
        if (cameraState.initialized) {
            Matrix4f viewProjection = new Matrix4f(cameraState.projectionMatrix).mul(cameraState.viewRotationMatrix);
            PlatformMeteorBridge.publishCamera(
                    cameraState.pos.x, cameraState.pos.y, cameraState.pos.z,
                    viewProjection.m00(), viewProjection.m10(), viewProjection.m20(), viewProjection.m30(),
                    viewProjection.m01(), viewProjection.m11(), viewProjection.m21(), viewProjection.m31(),
                    viewProjection.m02(), viewProjection.m12(), viewProjection.m22(), viewProjection.m32(),
                    viewProjection.m03(), viewProjection.m13(), viewProjection.m23(), viewProjection.m33());
        }

        PlatformMeteorBridge.publishPlayer(
                player.getX(), player.getY(), player.getZ(), player.getYRot(), player.getXRot(),
                player.getHealth(), player.getMaxHealth(), player.getFoodData().getFoodLevel(),
                player.onGround(), velocity.x, velocity.y, velocity.z,
                player.getInventory().getSelectedSlot(), player.getName().getString());

        PlatformMeteorBridge.publishPlayerExtra(player.isSprinting(), player.isShiftKeyDown(), player.hurtTime,
                player.fallDistance, player.input.getMoveVector().y, player.input.getMoveVector().x,
                player.isDeadOrDying(), player.isUsingItem());
        for (MobEffectInstance effect : player.getActiveEffects()) {
            PlatformMeteorBridge.publishEffect(effect.getEffect().value().getDisplayName().getString(), effect.getAmplifier(), effect.getDuration());
        }
        publishInventory(player);

        int count = 0;
        for (Entity entity : minecraft.level.entitiesForRendering()) {
            if (count++ >= MAX_ENTITIES) break;
            float health = -1.0F;
            float maxHealth = -1.0F;
            if (entity instanceof LivingEntity living) {
                health = living.getHealth();
                maxHealth = living.getMaxHealth();
            }
            boolean isPlayer = entity instanceof Player;
            boolean hostile = entity instanceof Enemy;
            PlatformMeteorBridge.publishEntity(
                    entity.getId(), entity.getName().getString(), entity.getX(), entity.getY(), entity.getZ(),
                    entity.getBbWidth(), entity.getBbHeight(), health, maxHealth,
                    isPlayer, hostile, entity instanceof LivingEntity && !isPlayer && !hostile,
                    entity.isInvisible(), entity == player || player.hasLineOfSight(entity));
            Vec3 movement = entity.getDeltaMovement();
            PlatformMeteorBridge.publishEntityExtra(BuiltInRegistries.ENTITY_TYPE.getKey(entity.getType()).toString(),
                    movement.x, movement.y, movement.z, !entity.isAlive());
        }
        PlatformMeteorBridge.endFrame();
        applyCommands(minecraft, player);
    }

    private static void publishInventory(LocalPlayer player) {
        for (int slot = 0; slot < 36; ++slot) publishItem(false, slot, player.getInventory().getItem(slot));
        publishItem(true, 0, player.getInventory().getItem(EquipmentSlot.FEET.getIndex(36)));
        publishItem(true, 1, player.getInventory().getItem(EquipmentSlot.LEGS.getIndex(36)));
        publishItem(true, 2, player.getInventory().getItem(EquipmentSlot.CHEST.getIndex(36)));
        publishItem(true, 3, player.getInventory().getItem(EquipmentSlot.HEAD.getIndex(36)));
    }

    private static void publishItem(boolean armor, int slot, ItemStack stack) {
        if (stack == null || stack.isEmpty()) {
            PlatformMeteorBridge.publishInventoryItem(armor, slot, "", "", 0, -1, 0, false, 0, 0.0F);
            return;
        }
        int maxDamage = stack.isDamageableItem() ? stack.getMaxDamage() : 0;
        int durability = maxDamage > 0 ? maxDamage - stack.getDamageValue() : -1;
        FoodProperties food = stack.get(DataComponents.FOOD);
        PlatformMeteorBridge.publishInventoryItem(
                armor, slot, BuiltInRegistries.ITEM.getKey(stack.getItem()).toString(), stack.getHoverName().getString(),
                stack.getCount(), durability, maxDamage, food != null, food != null ? food.nutrition() : 0,
                food != null ? food.saturation() : 0.0F);
    }

    private static void applyCommands(Minecraft minecraft, LocalPlayer player) {
        if (minecraft.gui.screen() != null || minecraft.gui.overlay() != null) PlatformMeteorBridge.restrictCommandsToCleanup();
        double brightness = PlatformMeteorBridge.takeBrightness();
        if (Double.isFinite(brightness)) {
            if (!Double.isFinite(savedBrightness)) savedBrightness = minecraft.options.gamma().get();
            minecraft.options.gamma().set(Math.max(0.0, Math.min(1.0, brightness)));
            if (Math.abs(brightness - savedBrightness) < 0.0001) savedBrightness = Double.NaN;
        }
        double fov = PlatformMeteorBridge.takeFov();
        if (Double.isFinite(fov)) fovOverride = Math.abs(fov - minecraft.options.fov().get()) < 0.001 ? Double.NaN : Math.max(5.0, Math.min(170.0, fov));
        int hurt = PlatformMeteorBridge.takeNoHurtCamera();
        if (hurt >= 0) noHurtCamera = hurt != 0;
        int crosshair = PlatformMeteorBridge.takeHideCrosshair();
        if (crosshair >= 0) hideCrosshair = crosshair != 0;
        if (PlatformMeteorBridge.takeRespawn() && player.isDeadOrDying()) player.respawn();
        if (PlatformMeteorBridge.takeSwing()) player.swing(InteractionHand.MAIN_HAND);
        int slot = PlatformMeteorBridge.takeSelectSlot();
        if (slot >= 0 && slot <= 8) player.getInventory().setSelectedSlot(slot);

        int sprinting = PlatformMeteorBridge.takeSprinting();
        if (sprinting >= 0) player.setSprinting(sprinting != 0);
        int sneaking = PlatformMeteorBridge.takeSneaking();
        if (sneaking >= 0) player.setShiftKeyDown(sneaking != 0);

        if (PlatformMeteorBridge.hasRotation()) {
            float yaw = (float)PlatformMeteorBridge.takeRotationYaw();
            float pitch = (float)PlatformMeteorBridge.takeRotationPitch();
            player.setYRot(yaw);
            player.setXRot(Math.max(-90.0F, Math.min(90.0F, pitch)));
        }
        if (PlatformMeteorBridge.hasVelocity()) {
            double x = PlatformMeteorBridge.takeVelocityX();
            double y = PlatformMeteorBridge.takeVelocityY();
            double z = PlatformMeteorBridge.takeVelocityZ();
            player.setDeltaMovement(x, y, z);
        }
        if (PlatformMeteorBridge.takeJump() && player.onGround()) player.jumpFromGround();

        for (int attacks = 0; attacks < 16; ++attacks) {
            int attackId = PlatformMeteorBridge.takeAttackEntityId();
            if (attackId < 0) break;
            if (minecraft.gameMode != null && minecraft.level != null && !player.isUsingItem()) {
                Entity target = minecraft.level.getEntity(attackId);
                if (target != null && target != player) {
                    minecraft.gameMode.attack(player, target);
                    player.swing(InteractionHand.MAIN_HAND);
                }
            }
        }
        int useItem = PlatformMeteorBridge.takeUseItem();
        if (useItem != 0 && minecraft.gameMode != null && !player.isUsingItem()) {
            InteractionHand hand = useItem == 2 ? InteractionHand.OFF_HAND : InteractionHand.MAIN_HAND;
            minecraft.gameMode.useItem(player, hand);
        }
    }
}
