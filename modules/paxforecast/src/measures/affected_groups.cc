#include "motis/paxforecast/measures/affected_groups.h"

#include <algorithm>

#include "utl/overloaded.h"

#include "motis/core/access/trip_access.h"

#include "motis/paxmon/localization.h"
#include "motis/paxmon/reachability.h"

using namespace motis::paxmon;

namespace motis::paxforecast::measures {

bool is_recipient(schedule const& sched, universe const& /*uv*/,
                  passenger_group const& /*pg*/,
                  passenger_localization const& loc, recipients const& rcpts) {
  if (loc.in_trip()) {
    return std::any_of(
        begin(rcpts.trips_), end(rcpts.trips_),
        [&](auto const& et) { return loc.in_trip_ == get_trip(sched, et); });
  } else {
    auto const loc_station = loc.at_station_->index_;
    return std::any_of(begin(rcpts.stations_), end(rcpts.stations_),
                       [&](auto const& si) { return loc_station == si; });
  }
}

passenger_localization localize(schedule const& sched, universe& uv,
                                affected_groups_info& result,
                                passenger_group const* pg,
                                time const loc_time) {
  if (auto const it = result.localization_.find(pg);
      it != end(result.localization_)) {
    return it->second;
  } else {
    return localize(sched, get_reachability(uv, pg->compact_planned_journey_),
                    loc_time);
  }
}

template <typename CheckFn>
void add_affected_groups(schedule const& sched, universe& uv,
                         affected_groups_info& result, recipients const& rcpts,
                         time const loc_time, measure_variant const* m,
                         CheckFn const& check_fn) {
  // TODO(pablo): performance optimizations - currently localizing every group
  for (auto const* pg : uv.passenger_groups_) {
    if (pg == nullptr || !pg->valid() || pg->probability_ == 0.0F) {
      continue;
    }
    auto const loc = localize(sched, uv, result, pg, loc_time);
    if (is_recipient(sched, uv, *pg, loc, rcpts) && check_fn(pg)) {
      result.localization_[pg] = loc;
      result.measures_[pg].emplace_back(m);
    }
  }
}

bool matches_destination(passenger_group const* pg,
                         trip_recommendation const& m) {
  // TODO(pablo): check planned_trips
  return !pg->compact_planned_journey_.legs_.empty() &&
         std::find(begin(m.planned_destinations_), end(m.planned_destinations_),
                   pg->compact_planned_journey_.destination_station_id()) !=
             end(m.planned_destinations_);
}

affected_groups_info get_affected_groups(schedule const& sched, universe& uv,
                                         time const loc_time,
                                         measure_set const& measures) {
  auto result = affected_groups_info{};
  for (auto const& mv : measures) {
    std::visit(
        utl::overloaded{
            [&](trip_recommendation const& m) {
              add_affected_groups(sched, uv, result, m.recipients_, loc_time,
                                  &mv, [&m](passenger_group const* pg) {
                                    return matches_destination(pg, m);
                                  });
            },
            [&](trip_load_information const& m) {
              add_affected_groups(sched, uv, result, m.recipients_, loc_time,
                                  &mv,
                                  [](passenger_group const*) { return true; });
            },
            [&](rt_update const& m) {
              add_affected_groups(sched, uv, result, m.recipients_, loc_time,
                                  &mv,
                                  [](passenger_group const*) { return true; });
            }},
        mv);
  }
  return result;
}

}  // namespace motis::paxforecast::measures
