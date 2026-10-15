package net.lax1dude.eaglercraft.v1_8.mods.meteor;

import net.lax1dude.eaglercraft.v1_8.internal.PlatformMeteorBridge;
import net.minecraft.client.Minecraft;
import net.minecraft.client.player.LocalPlayer;
import net.minecraft.client.renderer.state.level.CameraRenderState;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.monster.Enemy;
import net.minecraft.world.entity.player.Player;
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

    private EaglerHacksNativeBridge() {
    }

    public static void tick(Minecraft minecraft) {
        LocalPlayer player = minecraft.player;
        if (player == null || minecraft.level == null) {
            PlatformMeteorBridge.clear();
            return;
        }

        Vec3 velocity = player.getDeltaMovement();
        int targetId = minecraft.crosshairPickEntity != null ? minecraft.crosshairPickEntity.getId() : -1;
        PlatformMeteorBridge.beginFrame(
                minecraft.level.getGameTime(),
                minecraft.level.getGameTime(),
                minecraft.level.dimension().identifier().toString(),
                player.getId(), targetId);

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
                player.getX(), player.getY(), player.getZ(),
                player.getYRot(), player.getXRot(),
                player.getHealth(), player.getMaxHealth(), player.getFoodData().getFoodLevel(),
                player.onGround(), velocity.x, velocity.y, velocity.z,
                player.getInventory().getSelectedSlot(), player.getName().getString());

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
                    entity.getId(), entity.getName().getString(),
                    entity.getX(), entity.getY(), entity.getZ(),
                    entity.getBbWidth(), entity.getBbHeight(), health, maxHealth,
                    isPlayer, hostile, entity instanceof LivingEntity && !isPlayer && !hostile,
                    entity.isInvisible(), entity == player || player.hasLineOfSight(entity));
        }
        PlatformMeteorBridge.endFrame();
        applyCommands(minecraft, player);
    }

    private static void applyCommands(Minecraft minecraft, LocalPlayer player) {
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

        int attackId = PlatformMeteorBridge.takeAttackEntityId();
        if (attackId >= 0 && minecraft.gameMode != null && minecraft.level != null) {
            Entity target = minecraft.level.getEntity(attackId);
            if (target != null && target != player) minecraft.gameMode.attack(player, target);
        }

        int useItem = PlatformMeteorBridge.takeUseItem();
        if (useItem != 0 && minecraft.gameMode != null) {
            InteractionHand hand = useItem == 2 ? InteractionHand.OFF_HAND : InteractionHand.MAIN_HAND;
            minecraft.gameMode.useItem(player, hand);
        }
    }
}
