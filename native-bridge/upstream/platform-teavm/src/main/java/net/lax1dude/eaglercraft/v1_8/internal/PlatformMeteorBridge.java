package net.lax1dude.eaglercraft.v1_8.internal;

import org.teavm.jso.JSBody;

/** TeaVM implementation of the narrow EaglerHacks state/action bridge. */
public final class PlatformMeteorBridge {


    @JSBody(params = {}, script = "if(!globalThis.__eaghacksNativeBridge)globalThis.__eaghacksNativeBridge={version:1,upstream:'1be2375ad67cb42a52d5f586a2422e54b57be625',runtime:'Java/TeaVM-WasmGC'};")
    public static native void announce();

    @JSBody(params = { "name", "overlay" }, script = "var n=name==null?null:String(name),s=globalThis.__eaghacksScreenState;globalThis.__eaghacksScreenHookSeen=true;if(!s||s.screenName!==n||s.overlayActive!==!!overlay)globalThis.__eaghacksScreenState={screenName:n,overlayActive:!!overlay};")
    public static native void publishScreen(String name, boolean overlay);

    @JSBody(params = {}, script = "var c=globalThis.__eaghacksNativeCommands;if(!c)return;['rotation','velocity','jump','attackEntityId','useItem','swing'].forEach(function(k){delete c[k];});if(c.sprinting!==false)delete c.sprinting;if(c.sneaking!==false)delete c.sneaking;if(c.restoreSlot!==true)delete c.selectSlot;delete c.restoreSlot;")
    public static native void restrictCommandsToCleanup();

    @JSBody(params = { "biome" }, script = "var s=globalThis.__eaghacksNativeNextState;s.world.biome=String(biome);s.features.biome=true;s.features.effects=true;")
    public static native void publishBiome(String biome);

    @JSBody(params = { "name", "amplifier", "duration" }, script = "globalThis.__eaghacksNativeNextState.player.effects.push({name:String(name),amplifier:amplifier|0,duration:duration|0});")
    public static native void publishEffect(String name, int amplifier, int duration);

    @JSBody(params = { "hidden" }, script = "var s=globalThis.__eaghacksNativeNextState;s.options.hideCrosshair=!!hidden;s.features.crosshairControl=true;")
    public static native void publishCrosshair(boolean hidden);

    @JSBody(params = {}, script = "var c=globalThis.__eaghacksNativeCommands;if(!c||typeof c.hideCrosshair!=='boolean')return -1;var v=c.hideCrosshair?1:0;delete c.hideCrosshair;return v;")
    public static native int takeHideCrosshair();

    @JSBody(params = { "local", "paused", "brightness", "fov", "noHurtCamera" }, script =
            "var s=globalThis.__eaghacksNativeNextState;if(!s)return;"
          + "s.session={kind:local?'local':'remote',paused:!!paused};s.options={brightness:+brightness,fov:+fov,noHurtCamera:!!noHurtCamera};"
          + "s.features.brightnessControl=true;s.features.fovControl=true;s.features.hurtCameraControl=true;s.features.respawn=true;")
    public static native void publishContext(boolean local, boolean paused, double brightness, double fov, boolean noHurtCamera);

    @JSBody(params = { "sprinting", "sneaking", "hurtTime", "fallDistance", "forward", "strafe", "dead", "usingItem" }, script =
            "var s=globalThis.__eaghacksNativeNextState;if(!s||!s.player)return;"
          + "Object.assign(s.player,{sprinting:!!sprinting,sneaking:!!sneaking,hurtTime:hurtTime|0,fallDistance:+fallDistance,moveForward:+forward,moveStrafe:+strafe,dead:!!dead,usingItem:!!usingItem});")
    public static native void publishPlayerExtra(boolean sprinting, boolean sneaking, int hurtTime, double fallDistance, float forward, float strafe, boolean dead, boolean usingItem);

    @JSBody(params = { "type", "vx", "vy", "vz", "dead" }, script =
            "var a=globalThis.__eaghacksNativeNextState.entities;Object.assign(a[a.length-1],{type:String(type),velocity:{x:+vx,y:+vy,z:+vz},dead:!!dead});")
    public static native void publishEntityExtra(String type, double vx, double vy, double vz, boolean dead);

    @JSBody(params = {}, script = "var c=globalThis.__eaghacksNativeCommands;if(!c||c.swing!==true)return false;delete c.swing;return true;")
    public static native boolean takeSwing();

    @JSBody(params = {}, script = "var c=globalThis.__eaghacksNativeCommands;if(!c||c.respawn!==true)return false;delete c.respawn;return true;")
    public static native boolean takeRespawn();

    @JSBody(params = {}, script = "var c=globalThis.__eaghacksNativeCommands;if(!c||!Number.isFinite(c.brightness))return NaN;var v=+c.brightness;delete c.brightness;return v;")
    public static native double takeBrightness();

    @JSBody(params = {}, script = "var c=globalThis.__eaghacksNativeCommands;if(!c||!Number.isFinite(c.fov))return NaN;var v=+c.fov;delete c.fov;return v;")
    public static native double takeFov();

    @JSBody(params = {}, script = "var c=globalThis.__eaghacksNativeCommands;if(!c||typeof c.noHurtCamera!=='boolean')return -1;var v=c.noHurtCamera?1:0;delete c.noHurtCamera;return v;")
    public static native int takeNoHurtCamera();

    private PlatformMeteorBridge() {
    }

    @JSBody(params = {}, script = "delete globalThis.__eaghacksNativeNextState;delete globalThis.__eaghacksNativeState;delete globalThis.__eaghacksNativeCommands;globalThis.__eaghacksNativeSequence=0;")
    public static native void clear();

    @JSBody(params = { "tick", "gameTime", "dimension", "selfEntityId", "crosshairEntityId" }, script =
            "var seq=(globalThis.__eaghacksNativeSequence||0)+1;globalThis.__eaghacksNativeSequence=seq;globalThis.__eaghacksNativeNextState={version:1,tick:Number(tick),bridge:{sequence:seq,startedAt:performance.now()},world:{time:Number(gameTime),dimension:String(dimension),biome:null},player:null,entities:[],inventory:null,selfEntityId:selfEntityId|0,crosshairEntityId:crosshairEntityId|0,features:{directMovement:true,combat:true,multiAttack:true}};")
    public static native void beginFrame(long tick, long gameTime, String dimension, int selfEntityId, int crosshairEntityId);

    @JSBody(params = { "x", "y", "z",
            "m00", "m01", "m02", "m03", "m10", "m11", "m12", "m13",
            "m20", "m21", "m22", "m23", "m30", "m31", "m32", "m33" }, script =
            "var s=globalThis.__eaghacksNativeNextState;if(!s)return;"
          + "s.camera={x:+x,y:+y,z:+z,m:[+m00,+m01,+m02,+m03,+m10,+m11,+m12,+m13,+m20,+m21,+m22,+m23,+m30,+m31,+m32,+m33]};"
          + "s.features.render=true;")
    public static native void publishCamera(double x, double y, double z,
            float m00, float m01, float m02, float m03,
            float m10, float m11, float m12, float m13,
            float m20, float m21, float m22, float m23,
            float m30, float m31, float m32, float m33);

    @JSBody(params = { "x", "y", "z", "yaw", "pitch", "health", "maxHealth", "hunger", "onGround", "vx", "vy", "vz", "selectedSlot", "name" }, script =
            "var s=globalThis.__eaghacksNativeNextState;if(!s)return;"
          + "s.player={x:+x,y:+y,z:+z,yaw:+yaw,pitch:+pitch,health:+health,maxHealth:+maxHealth,hunger:hunger|0,onGround:!!onGround,name:String(name),velocity:{x:+vx,y:+vy,z:+vz},effects:[]};"
          + "s.inventory={selectedSlot:selectedSlot|0,hotbar:[],main:[],armor:[]};s.features.inventoryRead=true;")
    public static native void publishPlayer(double x, double y, double z, float yaw, float pitch,
            float health, float maxHealth, int hunger, boolean onGround,
            double vx, double vy, double vz, int selectedSlot, String name);

    @JSBody(params = { "armor", "slot", "id", "name", "count", "durability", "maxDurability", "food", "nutrition", "saturation" }, script =
            "var s=globalThis.__eaghacksNativeNextState;if(!s||!s.inventory)return;"
          + "var a=armor?s.inventory.armor:s.inventory.main;var i=slot|0;"
          + "if(!id){a[i]=null;if(!armor&&i<9)s.inventory.hotbar[i]=null;return;}"
          + "a[i]={slot:i,id:String(id),name:String(name),count:count|0,durability:durability|0,maxDurability:maxDurability|0,food:!!food,nutrition:nutrition|0,saturation:+saturation};"
          + "if(!armor&&i<9)s.inventory.hotbar[i]=a[i];s.features.inventoryRead=true;")
    public static native void publishInventoryItem(boolean armor, int slot, String id, String name, int count,
            int durability, int maxDurability, boolean food, int nutrition, float saturation);

    @JSBody(params = { "id", "name", "x", "y", "z", "width", "height", "health", "maxHealth", "player", "hostile", "passive", "invisible", "visible" }, script =
            "var s=globalThis.__eaghacksNativeNextState;if(!s)return;"
          + "s.entities.push({id:id|0,name:String(name),x:+x,y:+y,z:+z,width:+width,height:+height,health:+health,maxHealth:+maxHealth,isPlayer:!!player,hostile:!!hostile,passive:!!passive,invisible:!!invisible,visible:!!visible,isSelf:(id|0)===(s.selfEntityId|0)});")
    public static native void publishEntity(int id, String name, double x, double y, double z,
            float width, float height, float health, float maxHealth,
            boolean player, boolean hostile, boolean passive, boolean invisible, boolean visible);

    @JSBody(params = {}, script =
            "var s=globalThis.__eaghacksNativeNextState;if(!s)return;"
          + "s.bridge.snapshotMs=Math.max(0,performance.now()-s.bridge.startedAt);delete s.bridge.startedAt;globalThis.__eaghacksNativeState=s;delete globalThis.__eaghacksNativeNextState;")
    public static native void endFrame();

    @JSBody(params = {}, script = "var c=globalThis.__eaghacksNativeCommands;if(!c)return -1;var v=c.attackEntityId;if(Array.isArray(v)){var id=v.shift();if(!v.length)delete c.attackEntityId;return Number.isInteger(id)?id:-1;}if(typeof v!=='number')return -1;delete c.attackEntityId;return v|0;")
    public static native int takeAttackEntityId();

    @JSBody(params = {}, script = "var c=globalThis.__eaghacksNativeCommands;if(!c||c.useItem==null)return 0;var v=c.useItem==='offhand'?2:1;delete c.useItem;return v;")
    public static native int takeUseItem();

    @JSBody(params = {}, script = "var c=globalThis.__eaghacksNativeCommands;if(!c||typeof c.selectSlot!=='number')return -1;var v=c.selectSlot|0;delete c.selectSlot;delete c.restoreSlot;return v;")
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
