// automatically generated by the FlatBuffers compiler, do not modify

package motis;

import java.nio.*;
import java.lang.*;
import java.util.*;
import com.google.flatbuffers.*;

@SuppressWarnings("unused")
public final class Walk extends Table {
  public static Walk getRootAsWalk(ByteBuffer _bb) { return getRootAsWalk(_bb, new Walk()); }
  public static Walk getRootAsWalk(ByteBuffer _bb, Walk obj) { _bb.order(ByteOrder.LITTLE_ENDIAN); return (obj.__init(_bb.getInt(_bb.position()) + _bb.position(), _bb)); }
  public Walk __init(int _i, ByteBuffer _bb) { bb_pos = _i; bb = _bb; return this; }

  public Range range() { return range(new Range()); }
  public Range range(Range obj) { int o = __offset(4); return o != 0 ? obj.__init(o + bb_pos, bb) : null; }
  public int mumoId() { int o = __offset(6); return o != 0 ? bb.getInt(o + bb_pos) : 0; }
  public long price() { int o = __offset(8); return o != 0 ? (long)bb.getInt(o + bb_pos) & 0xFFFFFFFFL : 0; }
  public long accessibility() { int o = __offset(10); return o != 0 ? (long)bb.getInt(o + bb_pos) & 0xFFFFFFFFL : 0; }
  public String mumoType() { int o = __offset(12); return o != 0 ? __string(o + bb_pos) : null; }
  public ByteBuffer mumoTypeAsByteBuffer() { return __vector_as_bytebuffer(12, 1); }

  public static void startWalk(FlatBufferBuilder builder) { builder.startObject(5); }
  public static void addRange(FlatBufferBuilder builder, int rangeOffset) { builder.addStruct(0, rangeOffset, 0); }
  public static void addMumoId(FlatBufferBuilder builder, int mumoId) { builder.addInt(1, mumoId, 0); }
  public static void addPrice(FlatBufferBuilder builder, long price) { builder.addInt(2, (int)price, 0); }
  public static void addAccessibility(FlatBufferBuilder builder, long accessibility) { builder.addInt(3, (int)accessibility, 0); }
  public static void addMumoType(FlatBufferBuilder builder, int mumoTypeOffset) { builder.addOffset(4, mumoTypeOffset, 0); }
  public static int endWalk(FlatBufferBuilder builder) {
    int o = builder.endObject();
    return o;
  }
};
