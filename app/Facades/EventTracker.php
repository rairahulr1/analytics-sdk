<?php

namespace App\Facades;

use Illuminate\Support\Facades\Facade;

class EventTracker extends Facade
{
    protected static function getFacadeAccessor(): string
    {
        return \App\Helpers\EventTracker::class;
    }
}
