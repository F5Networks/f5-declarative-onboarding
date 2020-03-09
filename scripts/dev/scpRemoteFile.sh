#!/usr/bin/expect -f

if { $argc < 5 } {
    puts "usage: [info script] <IP> <admin_user> <admin_password> <full_path_to_source_file> <relative_path_to_dest_file>"
    exit 1
}

set IP [lindex $argv 0]
set ADMIN_USER [lindex $argv 1]
set ADMIN_PASS [lindex $argv 2]
set SOURCE [lindex $argv 3]
set DEST [lindex $argv 4]

# Do root user
while (1) {
    spawn scp -o "StrictHostKeyChecking no" admin@$IP:$SOURCE "$DEST"
    set timeout 5
    expect {
        "Password:" {
            send -- "$ADMIN_PASS\r"
            exp_continue
        }

        eof {
            break
        }
    }
}
