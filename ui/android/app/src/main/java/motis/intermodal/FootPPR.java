// automatically generated by the FlatBuffers compiler, do not modify

package motis.intermodal;

import java.nio.*;
import java.lang.*;
import java.util.*;
import com.google.flatbuffers.*;

@SuppressWarnings("unused")
public final class FootPPR extends Table {
  public static FootPPR getRootAsFootPPR(ByteBuffer _bb) { return getRootAsFootPPR(_bb, new FootPPR()); }
  public static FootPPR getRootAsFootPPR(ByteBuffer _bb, FootPPR obj) { _bb.order(ByteOrder.LITTLE_ENDIAN); return (obj.__init(_bb.getInt(_bb.position()) + _bb.position(), _bb)); }
  public FootPPR __init(int _i, ByteBuffer _bb) { bb_pos = _i; bb = _bb; return this; }

  public motis.ppr.SearchOptions searchOptions() { return searchOptions(new motis.ppr.SearchOptions()); }
  public motis.ppr.SearchOptions searchOptions(motis.ppr.SearchOptions obj) { int o = __offset(4); return o != 0 ? obj.__init(__indirect(o + bb_pos), bb) : null; }

  public static int createFootPPR(FlatBufferBuilder builder,
      int search_optionsOffset) {
    builder.startObject(1);
    FootPPR.addSearchOptions(builder, search_optionsOffset);
    return FootPPR.endFootPPR(builder);
  }

  public static void startFootPPR(FlatBufferBuilder builder) { builder.startObject(1); }
  public static void addSearchOptions(FlatBufferBuilder builder, int searchOptionsOffset) { builder.addOffset(0, searchOptionsOffset, 0); }
  public static int endFootPPR(FlatBufferBuilder builder) {
    int o = builder.endObject();
    return o;
  }
};
