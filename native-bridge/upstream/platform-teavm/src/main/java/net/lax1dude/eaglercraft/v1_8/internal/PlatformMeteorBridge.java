package net.lax1dude.eaglercraft.v1_8.internal;

import org.teavm.jso.JSBody;

/** TeaVM implementation of the narrow EaglerHacks state/action bridge. */
public final class PlatformMeteorBridge {

    private PlatformMeteorBridge() {
    }

    @JSBody(params = {}, script = "delete globalThis.__eaghacksNativeNextState;delete globalThis.__eaghacksNativeState;")
    public static native void clear();

    @JSBody(params = { "tick", "gameTime", "dimension", "selfEntityId", "crosshairEntityId" }, script =
            "globalThis.__eaghacksNativeNextState={version:1,tick:Number(tick),world:{time:Number(gameTime),dimension:String(dimension),biome:null},player:null,entities:[],inventory:null,selfEntityId:selfEntityId|0,crosshairEntityId:crosshairEntityId|0,features:{directMovement:true,combat:true}};")
    public static native void beginFrame(long tick, long gameTime, String dimension, int selfEntityId, int crosshairEntityId);

    @JSBody(params = { "x", "y", "z", "yaw", "pitch", "health", "maxHealth", "hunger", "onGround", "vx", "vy", "vz", "selectedSlot", "name" }, script =
            "var s=globalThis.__eaghacksNativeNextState;if(!s)return;"
          + "s.player={x:+x,y:+y,z:+z,yaw:+yaw,pitch:+pitch,health:+health,maxHealth:+maxHealth,hunger:hunger|0,onGround:!!onGround,name:String(name),velocity:{x:+vx,y:+vy,z:+vz}};"
          + "s.inventory={selectedSlot:selectedSlot|0,hotbar:[],armor:[]};")
    public static native void publishPlayer(double x, double y, double z, float yaw, float pitch,
            float health, float maxHealth, int hunger, boolean onGround,
            double vx, double vy, double vz, int selectedSlot, String name);

    @JSBody(params = { "id", "name", "x", "y", "z", "width", "height", "health", "maxHealth", "player", "hostile", "passive", "invisible", "visible" }, script =
            "var s=globalThis.__eaghacksNativeNextState;if(!s)return;"
          + "s.entities.push({id:id|0,name:String(name),x:+x,y:+y,z:+z,width:+width,height:+height,health:+health,maxHealth:+maxHealth,isPlayer:!!player,hostile:!!hostile,passive:!!passive,invisible:!!invisible,visible:!!visible,isSelf:(id|0)===(s.selfEntityId|0)});")
    public static native void publishEntity(int id, String name, double x, double y, double z,
            float width, float height, float health, float maxHealth,
            boolean player, boolean hostile, boolean passive, boolean invisible, boolean visible);

    @JSBody(params = {}, script =
            "var s=globalThis.__eaghacksNativeNextState;if(!s)return;"
          + "globalThis.__eaghacksNativeState=s;delete globalThis.__eaghacksNativeNextState;")
    public static native void endFrame();

    @JSBody(params = {}, script = "var c=globalThis.__eaghacksNativeCommands;if(!c||typeof c.attackEntityId!=='number')return -1;var v=c.attackEntityId|0;delete c.attackEntityId;return v;")
    public static native int takeAttackEntityId();

    @JSBody(params = {}, script = "var c=globalThis.__eaghacksNativeCommands;if(!c||c.useItem==null)return 0;var v=c.useItem==='offhand'?2:1;delete c.useItem;return v;")
    public static native int takeUseItem();

    @JSBody(params = {}, script = "var c=globalThis.__eaghacksNativeCommands;if(!c||typeof c.selectSlot!=='number')return -1;var v=c.selectSlot|0;delete c.selectSlot;return v;")
    public static native int takeSelectSlot();

    @JSBody(params = {}, script = "var c=globalThis.__eaghacksNativeCommands;if(!c||typeof c.sprinting!=='boolean')return -1;var v=c.sprinting?1:0;delete c.sprinting;return v;")
    public static native int takeSprinting();

    @JSBody(params = {}, script = "var c=globalThis.__eaghacksNativeCommands;if(!c||typeof c.sneaking!=='boolean')return -1;var v=c.sneaking?1:0;delete c.sneaking;return v;")
    public static native int takeSneaking();

    @JSBody(params = {}, script = "var c=globalThis.__eaghacksNativeCommands;if(!c||c.jump!==true)return false;delete c.jump;return true;")
    public static native boolean takeJump();

    @JSBody(params = {}, script = "var c=globalThis.__eaghacksNativeCommands;return !!(c&&c.rotation&&Number.isFinite(c.rotation.yaw)&&Number.isFinite(c.rotation.pitch));")
    public static native boolean hasRotation();

    @JSBody(params = {}, script = "var c=globalThis.__eaghacksNativeCommands;return c&&c.rotation?+c.rotation.yaw:0;")
    public static native double takeRotationYaw();

    @JSBody(params = {}, script = "var c=globalThis.__eaghacksNativeCommands;if(!c||!c.rotation)return 0;var v=+c.rotation.pitch;delete c.rotation;return v;")
    public static native double takeRotationPitch();

    @JSBody(params = {}, script = "var c=globalThis.__eaghacksNativeCommands;return !!(c&&c.velocity&&Number.isFinite(c.velocity.x)&&Number.isFinite(c.velocity.y)&&Number.isFinite(c.velocity.z));")
    public static native boolean hasVelocity();

    @JSBody(params = {}, script = "var c=globalThis.__eaghacksNativeCommands;return c&&c.velocity?+c.velocity.x:0;")
    public static native double takeVelocityX();

    @JSBody(params = {}, script = "var c=globalThis.__eaghacksNativeCommands;return c&&c.velocity?+c.velocity.y:0;")
    public static native double takeVelocityY();

    @JSBody(params = {}, script = "var c=globalThis.__eaghacksNativeCommands;if(!c||!c.velocity)return 0;var v=+c.velocity.z;delete c.velocity;return v;")
    public static native double takeVelocityZ();
}
