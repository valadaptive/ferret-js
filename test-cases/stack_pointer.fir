def i0 incr u8* {
    //%0 <- add %0 1
    *%0 = add %0 1
    test = 5
}

def i1 main {
    *i = 5
    call incr i
}
