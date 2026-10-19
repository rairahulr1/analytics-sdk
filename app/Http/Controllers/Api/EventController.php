<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\EventResource;
use App\Models\Event;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class EventController extends Controller
{
    /**
     * Store incoming analytics event(s) — supports both single event and batch payloads.
     */
    public function store(Request $request): JsonResponse
    {
        // Detect batch payload: either top-level array or an object with 'events' key
        $payload = $request->all();
        $isBatch = false;
        $rawEvents = [];

        if (isset($payload['events']) && is_array($payload['events'])) {
            $isBatch = true;
            $rawEvents = $payload['events'];
        } elseif (array_is_list($payload) && count($payload) > 0) {
            $isBatch = true;
            $rawEvents = $payload;
        } else {
            $rawEvents = [$payload];
        }

        $defaultIp = $request->ip();
        $defaultUserAgent = $request->userAgent();
        $now = now();
        $records = [];

        foreach ($rawEvents as $eventData) {
            if (! is_array($eventData)) {
                continue;
            }

            $validator = Validator::make($eventData, [
                'type' => ['required', 'string', 'max:255'],
                'source' => ['required', 'string', Rule::in(['browser', 'server'])],
                'properties' => ['sometimes', 'nullable', 'array'],
                'user_id' => ['sometimes', 'nullable', 'string', 'max:255'],
                'session_id' => ['sometimes', 'nullable', 'string', 'max:255'],
                'ip_address' => ['sometimes', 'nullable', 'string', 'max:45'],
                'user_agent' => ['sometimes', 'nullable', 'string'],
                'timestamp' => ['sometimes', 'nullable'],
            ]);

            if ($validator->fails()) {
                if (! $isBatch) {
                    return response()->json([
                        'status' => 'error',
                        'errors' => $validator->errors(),
                    ], 422);
                }

                continue;
            }

            $valid = $validator->validated();

            $createdAt = $now;
            if (! empty($valid['timestamp'])) {
                try {
                    $createdAt = Carbon::parse($valid['timestamp']);
                } catch (\Throwable) {
                    $createdAt = $now;
                }
            }

            $records[] = [
                'type' => $valid['type'],
                'source' => $valid['source'],
                'properties' => json_encode($valid['properties'] ?? new \stdClass),
                'user_id' => $valid['user_id'] ?? null,
                'session_id' => $valid['session_id'] ?? null,
                'ip_address' => $valid['ip_address'] ?? $defaultIp,
                'user_agent' => $valid['user_agent'] ?? $defaultUserAgent,
                'created_at' => $createdAt,
                'updated_at' => $now,
            ];
        }

        if (empty($records)) {
            return response()->json([
                'status' => 'error',
                'message' => 'No valid events provided',
            ], 422);
        }

        DB::table('events')->insert($records);

        return response()->json([
            'status' => 'ok',
            'ingested' => count($records),
        ], 201);
    }

    /**
     * List events with filtering and pagination.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Event::query();

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('source')) {
            $query->where('source', $request->source);
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->filled('session_id')) {
            $query->where('session_id', $request->session_id);
        }

        if ($request->filled('date_from')) {
            $query->where('created_at', '>=', Carbon::parse($request->date_from)->startOfDay());
        }

        if ($request->filled('date_to')) {
            $query->where('created_at', '<=', Carbon::parse($request->date_to)->endOfDay());
        }

        $perPage = min((int) ($request->get('per_page', 50)), 100);
        $paginator = $query->latest('created_at')->paginate($perPage);

        return response()->json([
            'events' => EventResource::collection($paginator->items()),
            'total' => $paginator->total(),
            'perPage' => $paginator->perPage(),
            'currentPage' => $paginator->currentPage(),
            'lastPage' => $paginator->lastPage(),
        ]);
    }

    /**
     * Aggregated statistics endpoint for dashboard visualization.
     */
    public function stats(Request $request): JsonResponse
    {
        $dateFrom = $request->filled('date_from')
            ? Carbon::parse($request->date_from)->startOfDay()
            : now()->subDays(30)->startOfDay();

        $dateTo = $request->filled('date_to')
            ? Carbon::parse($request->date_to)->endOfDay()
            : now()->endOfDay();

        $query = Event::whereBetween('created_at', [$dateFrom, $dateTo]);

        if ($request->filled('source')) {
            $query->where('source', $request->source);
        }

        // Summary counts
        $totalEvents = (clone $query)->count();
        $pageViews = (clone $query)->where('type', 'PageView')->count();

        // Unique visitors by session_id or user_id
        $uniqueVisitors = (clone $query)
            ->whereNotNull('session_id')
            ->distinct('session_id')
            ->count('session_id');

        if ($uniqueVisitors === 0) {
            $uniqueVisitors = (clone $query)
                ->whereNotNull('ip_address')
                ->distinct('ip_address')
                ->count('ip_address');
        }

        // Orders summary
        $ordersCount = (clone $query)->where('type', 'order_created')->count();

        // Event type breakdown
        $eventsByType = (clone $query)
            ->select('type', DB::raw('count(*) as count'))
            ->groupBy('type')
            ->orderByDesc('count')
            ->get();

        // Events by source
        $eventsBySource = (clone $query)
            ->select('source', DB::raw('count(*) as count'))
            ->groupBy('source')
            ->get();

        // Popular pages
        $driver = DB::connection()->getDriverName();
        if ($driver === 'pgsql') {
            $pathExpression = "properties->>'page_path'";
        } else {
            $pathExpression = "json_extract(properties, '$.page_path')";
        }

        $popularPages = (clone $query)
            ->where('type', 'PageView')
            ->whereNotNull(DB::raw($pathExpression))
            ->select(DB::raw("{$pathExpression} as path"), DB::raw('count(*) as views'))
            ->groupBy(DB::raw($pathExpression))
            ->orderByDesc('views')
            ->limit(10)
            ->get();

        // Daily trend
        if ($driver === 'pgsql') {
            $dateExpr = "TO_CHAR(created_at, 'YYYY-MM-DD')";
        } else {
            $dateExpr = "strftime('%Y-%m-%d', created_at)";
        }

        $dailyTrends = (clone $query)
            ->select(
                DB::raw("{$dateExpr} as date"),
                DB::raw('count(*) as total'),
                DB::raw("sum(case when type = 'PageView' then 1 else 0 end) as page_views"),
                DB::raw("sum(case when type = 'order_created' then 1 else 0 end) as orders")
            )
            ->groupBy(DB::raw($dateExpr))
            ->orderBy('date', 'asc')
            ->get();

        return response()->json([
            'date_range' => [
                'from' => $dateFrom->toDateString(),
                'to' => $dateTo->toDateString(),
            ],
            'summary' => [
                'total_events' => $totalEvents,
                'page_views' => $pageViews,
                'unique_visitors' => $uniqueVisitors,
                'orders_created' => $ordersCount,
            ],
            'events_by_type' => $eventsByType,
            'events_by_source' => $eventsBySource,
            'popular_pages' => $popularPages,
            'daily_trends' => $dailyTrends,
        ]);
    }
}
