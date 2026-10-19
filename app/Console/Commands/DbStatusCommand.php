<?php

namespace App\Console\Commands;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Database\Connection;
use Illuminate\Support\Facades\DB;
use Throwable;

#[Signature('db:status')]
#[Description('Check that the configured database connection has a working PDO handle')]
class DbStatusCommand extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        try {
            /** @var Connection $connection */
            $connection = DB::connection();
            $connection->getPdo();
        } catch (Throwable $exception) {
            $this->error('Database connection failed: '.$exception->getMessage());

            return self::FAILURE;
        }

        $this->info('Database connection OK ('.$connection->getName().')');

        return self::SUCCESS;
    }
}
